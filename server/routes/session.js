const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Session = require('../models/Session');
const {
  generateQuestions,
  generateFollowUp,
  evaluateSession,
  generateConfidenceAnalytics,
  generateLearningRecommendations,
  normalizeLanguage
} = require('../services/gemini');
const { authMiddleware, studentOnly, optionalAuth } = require('../middleware/auth');
const { isAnonymousRecord } = require('../utils/anonymous');
const { enrichResultPayload, assertStudentOwnsSession } = require('../utils/sessionPayload');

function sanitizeInput(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .substring(0, 5000);
}

router.post('/start', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { submissionId, language } = req.body;
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required.' });
    }

    const lang = normalizeLanguage(language);

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (isAnonymousRecord(submission)) {
      return res.status(403).json({ error: 'This submission is not linked to a registered student.' });
    }

    if (
      submission.studentEmail &&
      req.user.email &&
      submission.studentEmail.toLowerCase() !== req.user.email.toLowerCase()
    ) {
      return res.status(403).json({ error: 'You can only start a viva for your own submission.' });
    }

    console.log(`⏱️ Generating 5 viva questions (${lang}) for submission: ${submissionId}...`);
    const questionsList = await generateQuestions(submission.extractedText, lang);

    if (!Array.isArray(questionsList) || questionsList.length === 0) {
      return res.status(500).json({ error: 'Failed to generate questions. Please try again.' });
    }

    const formattedQuestions = questionsList.map((q) => ({
      question: q,
      generatedAt: new Date()
    }));

    const session = await Session.create({
      submissionId: submission._id,
      studentEmail: req.user?.email || submission.studentEmail || null,
      studentName: req.user?.fullName || submission.studentName || null,
      studentId: req.user?.studentId || submission.studentId || null,
      assignmentTitle: submission.fileName || 'Untitled Assignment',
      language: lang,
      questions: formattedQuestions,
      answers: [],
      status: 'in_progress'
    });

    console.log(`✅ Viva session started: ${session._id} [${lang}]`);

    return res.status(201).json({
      sessionId: session._id,
      totalQuestions: 5,
      currentQuestionIndex: 0,
      question: session.questions[0].question,
      language: lang
    });
  } catch (err) {
    console.error('❌ Failed to start session:', err.message, err.stack);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Internal server error while starting viva session.' });
  }
});

router.post('/answer', async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }
    if (typeof answer !== 'string') {
      return res.status(400).json({ error: 'answer must be a string.' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        error: 'Session is already completed.',
        redirect: true,
        resultUrl: `/result/${session._id}`
      });
    }

    const submission = await Submission.findById(session.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Associated submission not found.' });
    }

    const lang = session.language || 'en';
    const currentIdx = session.answers.length;
    if (currentIdx >= 5) {
      return res.status(400).json({ error: 'All questions have already been answered.' });
    }

    session.answers.push({
      answer: sanitizeInput(answer),
      answeredAt: new Date()
    });

    const nextIdx = currentIdx + 1;

    if (nextIdx < 5) {
      const history = session.questions.slice(0, nextIdx).map((q, idx) => ({
        question: q.question,
        answer: session.answers[idx].answer
      }));

      console.log(`⏱️ Generating follow-up question for Q${nextIdx + 1}...`);
      const followUpQuestion = await generateFollowUp(submission.extractedText, history, lang);

      session.questions[nextIdx] = {
        question: followUpQuestion,
        generatedAt: new Date()
      };

      await session.save();

      return res.status(200).json({
        status: 'in_progress',
        currentQuestionIndex: nextIdx,
        question: followUpQuestion
      });
    }

    console.log(`⏱️ Evaluating session ${session._id}...`);
    const history = session.questions.map((q, idx) => ({
      question: q.question,
      answer: session.answers[idx].answer
    }));

    const evaluation = await evaluateSession(submission.extractedText, history, lang);

    session.score = {
      overallScore: evaluation.overallScore,
      depthRating: evaluation.depthRating,
      authenticityFlag: evaluation.overallScore < 40,
      perQuestionFeedback: evaluation.perQuestionFeedback,
      summary: evaluation.summary
    };

    console.log(`⏱️ Generating confidence analytics & recommendations...`);
    try {
      session.analytics = await generateConfidenceAnalytics(
        submission.extractedText,
        history,
        session.score,
        submission.aiDetection
      );
      session.recommendations = await generateLearningRecommendations(
        submission.extractedText,
        history,
        session.analytics,
        session.score
      );
    } catch (extErr) {
      console.error('⚠️ Extended analytics failed (core score saved):', extErr.message);
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    console.log(`✅ Session completed: ${session._id}. Score: ${session.score.overallScore}`);

    return res.status(200).json({
      status: 'completed',
      redirect: true,
      resultUrl: `/result/${session._id}`
    });
  } catch (err) {
    console.error('❌ Failed to process answer:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Internal server error while processing answer.' });
  }
});

router.get('/:id/result', optionalAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    return res.status(200).json(await enrichResultPayload(session));
  } catch (err) {
    console.error('❌ Failed to fetch results:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error while retrieving results.' });
  }
});

router.get('/:id/analytics', authMiddleware, studentOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    assertStudentOwnsSession(req, session);
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    if (!session.analytics) {
      return res.status(404).json({ error: 'Analytics not available for this session.' });
    }
    const payload = await enrichResultPayload(session);
    return res.json({
      sessionId: session._id,
      assignmentTitle: session.assignmentTitle,
      analytics: session.analytics,
      score: session.score,
      aiDetection: payload.aiDetection
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
});

router.get('/:id/recommendations', authMiddleware, studentOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    assertStudentOwnsSession(req, session);
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session is still in progress.' });
    }
    if (!session.recommendations) {
      return res.status(404).json({ error: 'Recommendations not available for this session.' });
    }
    return res.json({
      sessionId: session._id,
      assignmentTitle: session.assignmentTitle,
      recommendations: session.recommendations,
      analytics: session.analytics,
      score: session.score
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
});

/* Reports are teacher-only — use GET /api/teacher/sessions/:id/report */
router.get('/:id/report', authMiddleware, (req, res) => {
  if (req.user?.role === 'student') {
    return res.status(403).json({
      error: 'Evaluation reports are available to teachers only.',
      hint: 'Students can view Confidence Dashboard and Learning Recommendations.'
    });
  }
  return res.status(403).json({ error: 'Use the teacher portal to access reports.' });
});

router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const currentIdx = session.answers.length;

    return res.status(200).json({
      sessionId: session._id,
      submissionId: session.submissionId,
      status: session.status,
      language: session.language || 'en',
      currentQuestionIndex: currentIdx,
      totalQuestions: 5,
      question: currentIdx < 5 ? session.questions[currentIdx]?.question : null,
      history: session.questions.slice(0, currentIdx).map((q, idx) => ({
        question: q.question,
        answer: session.answers[idx] ? session.answers[idx].answer : ''
      }))
    });
  } catch (err) {
    console.error('❌ Failed to fetch session state:', err.message);
    return res.status(500).json({ error: 'Internal server error while fetching session state.' });
  }
});

module.exports = router;
