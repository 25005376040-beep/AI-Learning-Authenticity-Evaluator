const Submission = require('../models/Submission');

async function buildQnas(session) {
  return session.questions.map((q, idx) => ({
    question: q.question,
    answer: session.answers[idx] ? session.answers[idx].answer : '',
    feedback: session.score?.perQuestionFeedback?.[idx] || ''
  }));
}

async function enrichResultPayload(session) {
  const submission = await Submission.findById(session.submissionId);
  const qnas = await buildQnas(session);
  return {
    sessionId: session._id,
    studentName: session.studentName,
    studentId: session.studentId,
    studentEmail: session.studentEmail,
    assignmentTitle: session.assignmentTitle,
    language: session.language || 'en',
    score: session.score,
    analytics: session.analytics || null,
    recommendations: session.recommendations || null,
    qnas,
    completedAt: session.completedAt,
    aiDetection: submission?.aiDetection || null
  };
}

function assertStudentOwnsSession(req, session) {
  if (!req.user || req.user.role !== 'student') {
    const err = new Error('Student access required.');
    err.statusCode = 403;
    throw err;
  }
  const emailMatch =
    session.studentEmail &&
    req.user.email &&
    session.studentEmail.toLowerCase() === req.user.email.toLowerCase();
  const idMatch = session.studentId && req.user.studentId && session.studentId === req.user.studentId;
  if (!emailMatch && !idMatch) {
    const err = new Error('You can only view your own session data.');
    err.statusCode = 403;
    throw err;
  }
}

module.exports = { buildQnas, enrichResultPayload, assertStudentOwnsSession };
