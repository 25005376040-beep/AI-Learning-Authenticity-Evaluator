const express = require('express');
const { authMiddleware, studentOnly } = require('../middleware/auth');
const Session = require('../models/Session');

const router = express.Router();
router.use(authMiddleware, studentOnly);

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.findAll({
      status: 'completed',
      studentEmail: req.user.email
    });

    const list = sessions
      .map((s) => ({
        _id: s._id,
        assignmentTitle: s.assignmentTitle || 'Untitled',
        overallScore: s.score?.overallScore ?? null,
        depthRating: s.score?.depthRating ?? null,
        authenticityFlag: s.score?.authenticityFlag ?? false,
        completedAt: s.completedAt
      }))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const scores = list.map((s) => s.overallScore).filter((n) => typeof n === 'number');
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    return res.json({
      totalSessions: list.length,
      averageScore,
      sessions: list
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
