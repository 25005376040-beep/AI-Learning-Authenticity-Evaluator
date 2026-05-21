const express = require('express');
const { authMiddleware, teacherOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Submission = require('../models/Submission');
const { useMockDb, purgeAnonymousRecords } = require('../db');
const { isAnonymousRecord, filterRegistered } = require('../utils/anonymous');
const { enrichResultPayload } = require('../utils/sessionPayload');

const router = express.Router();
router.use(authMiddleware, teacherOnly);

function detectionSummary(det) {
  if (!det) return null;
  return {
    verdict: det.verdict,
    aiProbability: det.aiProbability,
    riskLevel: det.riskLevel,
    confidenceLevel: det.confidenceLevel
  };
}

async function sessionWithDetection(s) {
  if (isAnonymousRecord(s)) return null;

  const sub = s.submissionId ? await Submission.findById(s.submissionId) : null;
  if (sub && isAnonymousRecord(sub)) return null;

  const aiDetection = sub?.aiDetection || null;
  return {
    _id: s._id,
    sessionId: s._id,
    studentName: s.studentName || sub?.studentName || 'Unknown Student',
    studentEmail: s.studentEmail || sub?.studentEmail || '',
    assignmentTitle: s.assignmentTitle || sub?.fileName || 'Untitled',
    overallScore: s.score?.overallScore ?? null,
    depthRating: s.score?.depthRating ?? null,
    authenticityFlag: s.score?.authenticityFlag ?? false,
    completedAt: s.completedAt,
    status: s.status,
    aiDetection: detectionSummary(aiDetection),
    aiDetectionFull: aiDetection
  };
}

router.get('/dashboard', async (req, res) => {
  try {
    await purgeAnonymousRecords();

    const students = filterRegistered(
      useMockDb ? await Student.findAll() : await Student.find()
    );
    const allSessions = await Session.findAll({ status: 'completed' });
    const sessions = filterRegistered(allSessions);
    const allSubmissions = useMockDb ? await Submission.findAll() : await Submission.find();
    const submissions = filterRegistered(allSubmissions);

    const scores = sessions.map((s) => s.score?.overallScore).filter((n) => typeof n === 'number');
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const flaggedSessions = sessions.filter((s) => s.score?.authenticityFlag).length;
    const aiFlagged = submissions.filter((s) => s.aiDetection?.riskLevel === 'High Risk').length;

    const recent = (
      await Promise.all(
        sessions
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          .slice(0, 5)
          .map(sessionWithDetection)
      )
    ).filter(Boolean);

    return res.json({
      totalStudents: students.length,
      totalSessions: sessions.length,
      averageScore,
      flaggedSessions,
      aiFlagged,
      recentSessions: recent
    });
  } catch (err) {
    console.error('❌ Teacher dashboard:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = filterRegistered(
      useMockDb ? await Student.findAll() : await Student.find()
    );
    const allSessions = filterRegistered(await Session.findAll({ status: 'completed' }));

    const list = students.map((st) => {
      const pub = st.toPublic ? st.toPublic() : st;
      const mine = allSessions.filter(
        (s) => s.studentEmail === pub.email || s.studentId === pub.studentId
      );
      const latest = mine.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
      const scores = mine.map((s) => s.score?.overallScore).filter((n) => typeof n === 'number');
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      return {
        ...pub,
        totalSessions: mine.length,
        averageScore: avg,
        latestScore: latest?.score?.overallScore ?? null
      };
    });

    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = filterRegistered(await Session.findAll({ status: 'completed' }));
    const enriched = (await Promise.all(sessions.map(sessionWithDetection))).filter(Boolean);
    return res.json(enriched.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/ai-risk-report', async (req, res) => {
  try {
    const allSubmissions = useMockDb ? await Submission.findAll() : await Submission.find();
    const submissions = filterRegistered(allSubmissions).filter((s) => s.aiDetection);

    const highRisk = submissions.filter((s) => s.aiDetection.riskLevel === 'High Risk');
    const mediumRisk = submissions.filter((s) => s.aiDetection.riskLevel === 'Medium Risk');
    const lowRisk = submissions.filter((s) => s.aiDetection.riskLevel === 'Low Risk');

    const mapRow = (s) => ({
      submissionId: s._id,
      studentName: s.studentName || 'Unknown Student',
      studentEmail: s.studentEmail || '',
      fileName: s.fileName,
      aiProbability: s.aiDetection.aiProbability,
      verdict: s.aiDetection.verdict,
      riskLevel: s.aiDetection.riskLevel,
      detectedAt: s.aiDetection.detectedAt
    });

    return res.json({
      highRisk: highRisk.map(mapRow).sort((a, b) => b.aiProbability - a.aiProbability),
      mediumRisk: mediumRisk.map(mapRow).sort((a, b) => b.aiProbability - a.aiProbability),
      lowRisk: lowRisk.map(mapRow),
      totalFlagged: highRisk.length + mediumRisk.length,
      summary: {
        highRiskCount: highRisk.length,
        mediumRiskCount: mediumRisk.length,
        lowRiskCount: lowRisk.length
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function loadTeacherSession(id) {
  const session = await Session.findById(id);
  if (!session || isAnonymousRecord(session)) return null;
  const sub = session.submissionId ? await Submission.findById(session.submissionId) : null;
  if (sub && isAnonymousRecord(sub)) return null;
  return { session, sub };
}

router.get('/sessions/:id/analytics', async (req, res) => {
  try {
    const loaded = await loadTeacherSession(req.params.id);
    if (!loaded) return res.status(404).json({ error: 'Session not found.' });
    const { session, sub } = loaded;
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    if (!session.analytics) {
      return res.status(404).json({ error: 'Analytics not available for this session.' });
    }
    const base = await sessionWithDetection(session);
    return res.json({
      sessionId: session._id,
      studentName: session.studentName,
      assignmentTitle: session.assignmentTitle,
      analytics: session.analytics,
      score: session.score,
      aiDetection: sub?.aiDetection || base?.aiDetectionFull || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id/recommendations', async (req, res) => {
  try {
    const loaded = await loadTeacherSession(req.params.id);
    if (!loaded) return res.status(404).json({ error: 'Session not found.' });
    const { session } = loaded;
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    if (!session.recommendations) {
      return res.status(404).json({ error: 'Recommendations not available for this session.' });
    }
    return res.json({
      sessionId: session._id,
      studentName: session.studentName,
      assignmentTitle: session.assignmentTitle,
      recommendations: session.recommendations,
      analytics: session.analytics,
      score: session.score
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id/report', async (req, res) => {
  try {
    const loaded = await loadTeacherSession(req.params.id);
    if (!loaded) return res.status(404).json({ error: 'Session not found.' });
    const { session } = loaded;
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    const payload = await enrichResultPayload(session);
    return res.json({
      ...payload,
      evaluationId: `EV-${session._id}`,
      generatedAt: new Date().toISOString(),
      footer: 'Generated by AI Learning Authenticity Evaluator'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const loaded = await loadTeacherSession(req.params.id);
    if (!loaded) return res.status(404).json({ error: 'Session not found.' });
    const { session, sub } = loaded;

    const qnas = session.questions?.map((q, idx) => ({
      question: q.question,
      answer: session.answers[idx]?.answer || '',
      feedback: session.score?.perQuestionFeedback?.[idx] || ''
    })) || [];

    const base = await sessionWithDetection(session);
    if (!base) return res.status(404).json({ error: 'Session not found.' });

    return res.json({
      ...base,
      qnas,
      score: session.score,
      summary: session.score?.summary,
      aiDetection: sub?.aiDetection || null,
      analytics: session.analytics || null,
      recommendations: session.recommendations || null,
      hasAnalytics: Boolean(session.analytics),
      hasRecommendations: Boolean(session.recommendations)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/students/:studentId', async (req, res) => {
  try {
    const student = await Student.findByStudentId(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const email = student.email;
    const studentId = student.studentId;

    if (useMockDb) {
      await Student.deleteByStudentId(studentId);
    } else {
      const Session = require('../models/Session');
      const Submission = require('../models/Submission');
      await Session.deleteMany({ $or: [{ studentEmail: email }, { studentId }] });
      await Submission.deleteMany({ $or: [{ studentEmail: email }, { studentId }] });
      await Student.deleteByStudentId(studentId);
    }

    console.log(`🗑️ Student deleted: ${studentId} (${email})`);
    return res.json({ message: 'Student and related records deleted successfully.' });
  } catch (err) {
    console.error('❌ Delete student failed:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to delete student.' });
  }
});

router.get('/students/:studentId/history', async (req, res) => {
  try {
    const student = await Student.findByStudentId(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const pub = student.toPublic ? student.toPublic() : student;
    const sessions = filterRegistered(
      await Session.findAll({
        status: 'completed',
        studentEmail: pub.email
      })
    );

    const enriched = (await Promise.all(sessions.map(sessionWithDetection))).filter(Boolean);

    return res.json({
      student: pub,
      sessions: enriched.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
