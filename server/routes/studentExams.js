const express = require('express');
const { authMiddleware, studentOnly } = require('../middleware/auth');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const { createNotification } = require('../utils/notify');

const router = express.Router();
router.use(authMiddleware, studentOnly);

function stripExam(exam) {
  if (!exam) return null;
  const plain = typeof exam.toObject === 'function' ? exam.toObject() : { ...exam };
  return {
    _id: plain._id,
    title: plain.title,
    subject: plain.subject,
    topic: plain.topic,
    instructions: plain.instructions,
    dueDate: plain.dueDate,
    startTime: plain.startTime,
    endTime: plain.endTime,
    attemptLimit: plain.attemptLimit,
    totalMarks: plain.totalMarks,
    questions: (plain.questions || []).map((q) => {
      const { correctOption, ...rest } = q;
      return rest;
    })
  };
}

function windowOpen(exam) {
  const now = Date.now();
  if (exam.startTime && new Date(exam.startTime).getTime() > now) return false;
  if (exam.endTime && new Date(exam.endTime).getTime() < now) return false;
  return true;
}

router.get('/', async (req, res) => {
  try {
    const attempts = await ExamAttempt.findAll({
      studentEmail: req.user.email
    });

    const list = await Promise.all(
      attempts.map(async (a) => {
        const exam = await Exam.findById(a.examId);
        return {
          _id: a._id,
          examId: a.examId,
          title: exam?.title || 'Exam',
          subject: exam?.subject,
          status: a.status,
          dueDate: exam?.dueDate,
          endTime: exam?.endTime,
          marksObtained: a.marksObtained,
          percentage: a.percentage,
          maxMarks: a.maxMarks || exam?.totalMarks,
          submittedAt: a.submittedAt,
          gradedAt: a.gradedAt
        };
      })
    );

    list.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0));

    const upcoming = list.filter((e) =>
      ['assigned', 'pending', 'in_progress'].includes(e.status)
    );
    const completed = list.filter((e) =>
      ['submitted', 'reviewed', 'graded'].includes(e.status)
    );
    const scores = completed
      .filter((e) => e.status === 'graded' && typeof e.percentage === 'number')
      .map((e) => ({ title: e.title, percentage: e.percentage, date: e.gradedAt }));

    return res.json({ exams: list, upcoming, completed, scoreHistory: scores });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:attemptId/result', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (
      !attempt ||
      attempt.studentEmail?.toLowerCase() !== req.user.email?.toLowerCase()
    ) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (!['graded', 'reviewed', 'submitted'].includes(attempt.status)) {
      return res.status(400).json({ error: 'Results not available yet' });
    }

    const exam = await Exam.findById(attempt.examId);

    return res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        marksObtained: attempt.marksObtained,
        maxMarks: attempt.maxMarks,
        percentage: attempt.percentage,
        teacherFeedback: attempt.teacherFeedback,
        teacherComments: attempt.teacherComments,
        answers: attempt.answers,
        submittedAt: attempt.submittedAt,
        gradedAt: attempt.gradedAt
      },
      exam: { title: exam?.title, questions: exam?.questions }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:attemptId', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (
      !attempt ||
      (attempt.studentEmail?.toLowerCase() !== req.user.email?.toLowerCase() &&
        attempt.studentId !== req.user.studentId)
    ) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = await Exam.findById(attempt.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    return res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        answers: attempt.answers,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt
      },
      exam: stripExam(exam),
      canStart: windowOpen(exam) && !['submitted', 'graded', 'reviewed'].includes(attempt.status)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:attemptId/start', async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (
      !attempt ||
      attempt.studentEmail?.toLowerCase() !== req.user.email?.toLowerCase()
    ) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = await Exam.findById(attempt.examId);
    if (!windowOpen(exam)) {
      return res.status(403).json({ error: 'Exam window is closed' });
    }

    if (['submitted', 'graded', 'reviewed'].includes(attempt.status)) {
      return res.status(400).json({ error: 'Exam already submitted' });
    }

    if (attempt.status === 'assigned') attempt.status = 'pending';
    if (!attempt.startedAt) {
      attempt.startedAt = new Date();
      attempt.status = 'in_progress';
    }
    await attempt.save();

    return res.json({ attempt, exam: stripExam(exam) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:attemptId/save', async (req, res) => {
  try {
    const { answers } = req.body;
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (
      !attempt ||
      attempt.studentEmail?.toLowerCase() !== req.user.email?.toLowerCase()
    ) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (!['in_progress', 'pending', 'assigned'].includes(attempt.status)) {
      return res.status(400).json({ error: 'Cannot save — exam closed' });
    }

    attempt.answers = (answers || []).map((a) => ({
      questionId: a.questionId,
      value: a.value,
      savedAt: new Date()
    }));
    if (attempt.status === 'pending' || attempt.status === 'assigned') {
      attempt.status = 'in_progress';
    }
    await attempt.save();

    return res.json({ saved: true, attemptId: attempt._id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:attemptId/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const attempt = await ExamAttempt.findById(req.params.attemptId);
    if (
      !attempt ||
      attempt.studentEmail?.toLowerCase() !== req.user.email?.toLowerCase()
    ) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = await Exam.findById(attempt.examId);
    if (!windowOpen(exam) && !attempt.submittedAt) {
      return res.status(403).json({ error: 'Exam window has ended' });
    }

    if (answers?.length) {
      attempt.answers = answers.map((a) => ({
        questionId: a.questionId,
        value: a.value,
        savedAt: new Date()
      }));
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.maxMarks = exam?.totalMarks;
    await attempt.save();

    await createNotification({
      role: 'teacher',
      type: 'exam_submitted',
      title: 'New submission',
      message: `${attempt.studentName} submitted "${exam?.title}".`,
      link: `/teacher/exams/submissions/${attempt._id}`
    });

    return res.json({ attempt, message: 'Exam submitted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
