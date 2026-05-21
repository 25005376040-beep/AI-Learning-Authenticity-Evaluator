const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const { authMiddleware, teacherOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Student = require('../models/Student');
const { generateExamQuestions, suggestExamGrading } = require('../services/gemini');
const { createNotification } = require('../utils/notify');
const { useMockDb } = require('../db');
const { aiErrorPayload } = require('../utils/httpErrors');

const router = express.Router();
router.use(authMiddleware, teacherOnly);

function teacherName(req) {
  return req.user?.username || 'Your teacher';
}

function examTotalMarks(questions) {
  return (questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);
}

function teacherOwnsExam(exam, req) {
  if (!exam?.teacherUsername) return req.user?.role === 'teacher';
  return exam.teacherUsername === req.user?.username;
}

function resolveMaxMarks(attempt, exam) {
  const fromQuestions = examTotalMarks(exam?.questions);
  return (
    Number(attempt?.maxMarks) ||
    Number(exam?.totalMarks) ||
    fromQuestions ||
    100
  );
}

async function resolveStudentTargets({ studentIds, assignAll }) {
  const all = useMockDb ? await Student.findAll() : await Student.find();
  const list = Array.isArray(all) ? all : [];
  if (assignAll) {
    return list.map((s) => ({
      studentId: s.studentId,
      studentEmail: s.email,
      studentName: s.fullName
    }));
  }
  const ids = new Set((studentIds || []).map(String));
  return list
    .filter((s) => ids.has(s.studentId) || ids.has(s.email))
    .map((s) => ({
      studentId: s.studentId,
      studentEmail: s.email,
      studentName: s.fullName
    }));
}

router.post('/generate', async (req, res) => {
  try {
    const { topic, subject, difficulty, count, questionTypes } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required' });

    const generated = await generateExamQuestions({
      topic: topic.trim(),
      subject,
      difficulty,
      count,
      questionTypes
    });

    generated.totalMarks = examTotalMarks(generated.questions);
    return res.json(generated);
  } catch (err) {
    const { status, body } = aiErrorPayload(err);
    return res.status(status).json(body);
  }
});

router.post('/generate-from-pdf', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Upload failed' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a PDF file.' });
      }

      const ext = req.file.originalname?.toLowerCase() || '';
      if (!ext.endsWith('.pdf')) {
        return res.status(400).json({ error: 'Only PDF files are supported.' });
      }

      const buffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(buffer);
      const sourceText = (pdfData.text || '').trim();

      if (sourceText.length < 80) {
        return res.status(400).json({
          error: 'Could not extract enough text from PDF. Try a text-based PDF (not a scanned image).'
        });
      }

      const { topic, subject, difficulty, count, questionTypes } = req.body;

      const generated = await generateExamQuestions({
        topic: topic?.trim() || 'PDF material',
        subject,
        difficulty,
        count,
        questionTypes,
        sourceText,
        sourceFileName: req.file.originalname
      });

      generated.totalMarks = examTotalMarks(generated.questions);
      generated.sourceType = 'pdf';
      generated.sourceFileName = req.file.originalname;

      return res.json(generated);
    } catch (err) {
      const { status, body } = aiErrorPayload(err);
      return res.status(status).json(body);
    } finally {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
    }
  });
});

router.post('/', async (req, res) => {
  try {
    const { title, subject, topic, instructions, questions } = req.body;
    if (!title || !questions?.length) {
      return res.status(400).json({ error: 'Title and questions are required' });
    }

    const exam = await Exam.create({
      teacherUsername: req.user.username,
      title,
      subject: subject || '',
      topic: topic || '',
      instructions: instructions || '',
      questions,
      status: 'draft',
      totalMarks: examTotalMarks(questions),
      createdAt: new Date()
    });

    return res.status(201).json({ exam });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const exams = await Exam.findAll({ teacherUsername: req.user.username });
    const assigned = exams.filter((e) => e.status === 'assigned');
    const attempts = [];
    for (const ex of assigned) {
      const list = await ExamAttempt.findAll({ examId: ex._id });
      attempts.push(...list);
    }

    const submitted = attempts.filter((a) =>
      ['submitted', 'reviewed', 'graded'].includes(a.status)
    );
    const graded = attempts.filter((a) => a.status === 'graded');
    const pendingReview = attempts.filter((a) => a.status === 'submitted');

    const percentages = graded
      .map((a) => a.percentage)
      .filter((n) => typeof n === 'number');
    const averageClassScore = percentages.length
      ? Math.round(percentages.reduce((x, y) => x + y, 0) / percentages.length)
      : null;

    const byStudent = {};
    graded.forEach((a) => {
      if (!byStudent[a.studentId]) byStudent[a.studentId] = { name: a.studentName, scores: [] };
      if (typeof a.percentage === 'number') byStudent[a.studentId].scores.push(a.percentage);
    });
    const ranked = Object.entries(byStudent)
      .map(([id, v]) => ({
        studentId: id,
        studentName: v.name,
        average: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
      }))
      .sort((a, b) => b.average - a.average);

    const submissionRate =
      attempts.length > 0 ? Math.round((submitted.length / attempts.length) * 100) : 0;

    return res.json({
      totalExamsAssigned: assigned.length,
      totalAttempts: attempts.length,
      submissionRate,
      averageClassScore,
      pendingReviews: pendingReview.length,
      topPerformers: ranked.slice(0, 5),
      weakStudents: ranked.filter((r) => r.average < 50).slice(-5).reverse()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const exams = await Exam.findAll({ teacherUsername: req.user.username });
    const enriched = await Promise.all(
      exams.map(async (ex) => {
        const attempts = await ExamAttempt.findAll({ examId: ex._id });
        const submitted = attempts.filter((a) =>
          ['submitted', 'reviewed', 'graded'].includes(a.status)
        ).length;
        return {
          _id: ex._id,
          title: ex.title,
          subject: ex.subject,
          topic: ex.topic,
          status: ex.status,
          totalMarks: ex.totalMarks,
          dueDate: ex.dueDate,
          startTime: ex.startTime,
          endTime: ex.endTime,
          assignedCount: attempts.length,
          submittedCount: submitted,
          createdAt: ex.createdAt,
          assignedAt: ex.assignedAt
        };
      })
    );
    return res.json({ exams: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/submissions/all', async (req, res) => {
  try {
    const exams = await Exam.findAll({ teacherUsername: req.user.username, status: 'assigned' });
    const rows = [];
    for (const ex of exams) {
      const attempts = await ExamAttempt.findAll({ examId: ex._id });
      for (const a of attempts) {
        if (['submitted', 'reviewed', 'graded', 'in_progress'].includes(a.status)) {
          rows.push({
            _id: a._id,
            examId: ex._id,
            examTitle: ex.title,
            studentName: a.studentName,
            status: a.status,
            submittedAt: a.submittedAt,
            percentage: a.percentage
          });
        }
      }
    }
    rows.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    return res.json({ submissions: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/submissions/:attemptId', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ error: 'Submission not found' });

    const exam = await Exam.findById(attempt.examId);
    if (!exam || !teacherOwnsExam(exam, req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const maxMarks = resolveMaxMarks(attempt, exam);
    return res.json({ exam, attempt, maxMarks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/submissions/:attemptId/ai-grade', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ error: 'Submission not found' });

    const exam = await Exam.findById(attempt.examId);
    if (!teacherOwnsExam(exam, req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const aiGrading = await suggestExamGrading(exam, attempt);
    attempt.aiGrading = aiGrading;
    if (attempt.status === 'submitted') attempt.status = 'reviewed';
    await attempt.save();

    return res.json({ aiGrading, attempt });
  } catch (err) {
    const { status, body } = aiErrorPayload(err);
    return res.status(status).json(body);
  }
});

async function applyGrade(req, res) {
  const { marksObtained, teacherFeedback, teacherComments, approve } = req.body;
  const attempt = await ExamAttempt.findById(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Submission not found' });

  if (!['submitted', 'reviewed', 'graded'].includes(attempt.status)) {
    return res.status(400).json({
      error: 'Student must submit the exam before you can grade it.'
    });
  }

  const exam = await Exam.findById(attempt.examId);
  if (!exam || !teacherOwnsExam(exam, req)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const max = resolveMaxMarks(attempt, exam);
  const rawMarks = marksObtained ?? attempt.marksObtained;
  const parsed = Number(rawMarks);
  if (!Number.isFinite(parsed)) {
    return res.status(400).json({ error: 'Enter a valid marks obtained value.' });
  }

  const marks = Math.max(0, Math.min(max, Math.round(parsed * 10) / 10));
  attempt.marksObtained = marks;
  attempt.maxMarks = max;
  attempt.percentage = max > 0 ? Math.round((marks / max) * 100) : 0;
  attempt.teacherFeedback = String(teacherFeedback ?? attempt.teacherFeedback ?? '').trim();
  attempt.teacherComments = String(teacherComments ?? attempt.teacherComments ?? '').trim();
  attempt.gradedBy = req.user?.username || 'teacher';
  attempt.gradedAt = new Date();
  attempt.status = approve !== false ? 'graded' : 'reviewed';

  if (!attempt.save) {
    return res.status(500).json({ error: 'Could not save grade — database error.' });
  }
  await attempt.save();

  try {
    await createNotification({
      studentEmail: attempt.studentEmail,
      studentId: attempt.studentId,
      role: 'student',
      type: 'exam_graded',
      title: 'Exam graded',
      message: `Your exam "${exam.title}" has been graded. Score: ${marks}/${max} (${attempt.percentage}%).`,
      link: `/student/exams/${attempt._id}/result`
    });
  } catch (notifyErr) {
    console.warn('Grade saved but notification failed:', notifyErr.message);
  }

  const payload = attempt.toJSON ? attempt.toJSON() : { ...attempt };
  return res.json({
    success: true,
    message: 'Final score approved and saved.',
    attempt: payload,
    maxMarks: max
  });
}

router.post('/submissions/:attemptId/grade', async (req, res) => {
  try {
    return await applyGrade(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Grading failed' });
  }
});

router.put('/submissions/:attemptId/grade', async (req, res) => {
  try {
    return await applyGrade(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Grading failed' });
  }
});

router.get('/:examId', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam || !teacherOwnsExam(exam, req)) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    return res.json({ exam });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:examId/assign', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam || !teacherOwnsExam(exam, req)) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const {
      studentIds,
      assignAll,
      dueDate,
      startTime,
      endTime,
      attemptLimit,
      instructions
    } = req.body;

    const targets = await resolveStudentTargets({ studentIds, assignAll });
    if (!targets.length) return res.status(400).json({ error: 'No students selected' });

    exam.dueDate = dueDate ? new Date(dueDate) : null;
    exam.startTime = startTime ? new Date(startTime) : null;
    exam.endTime = endTime ? new Date(endTime) : null;
    exam.attemptLimit = Math.max(1, Number(attemptLimit) || 1);
    if (instructions) exam.instructions = instructions;
    exam.status = 'assigned';
    exam.assignedAt = new Date();
    exam.totalMarks = examTotalMarks(exam.questions);
    await exam.save();

    const name = teacherName(req);
    let created = 0;

    for (const t of targets) {
      const existing = await ExamAttempt.findByExamAndStudent(exam._id, t.studentId);
      if (existing) continue;

      await ExamAttempt.create({
        examId: exam._id,
        studentId: t.studentId,
        studentEmail: t.studentEmail,
        studentName: t.studentName,
        status: 'assigned',
        answers: [],
        maxMarks: exam.totalMarks
      });

      await createNotification({
        studentEmail: t.studentEmail,
        studentId: t.studentId,
        role: 'student',
        type: 'exam_assigned',
        title: 'New exam assigned',
        message: `You have received a new AI-generated exam from ${name}: "${exam.title}".`,
        link: '/student/exams'
      });
      created += 1;
    }

    await createNotification({
      role: 'teacher',
      type: 'exam_sent',
      title: 'Exam sent',
      message: `"${exam.title}" sent to ${created} student(s).`,
      link: '/teacher/exams/submissions'
    });

    return res.json({ exam, assignedCount: created });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:examId/submissions', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam || !teacherOwnsExam(exam, req)) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const attempts = await ExamAttempt.findAll({ examId: exam._id });
    return res.json({
      exam: { _id: exam._id, title: exam.title, totalMarks: exam.totalMarks },
      submissions: attempts.map((a) => ({
        _id: a._id,
        studentId: a.studentId,
        studentName: a.studentName,
        studentEmail: a.studentEmail,
        status: a.status,
        submittedAt: a.submittedAt,
        marksObtained: a.marksObtained,
        percentage: a.percentage,
        gradedAt: a.gradedAt
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
