const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const filter =
      req.user.role === 'student'
        ? { studentEmail: req.user.email, role: 'student' }
        : { role: 'teacher' };

    const list = await Notification.findAll(filter);
    return res.json({ notifications: list.slice(0, 50) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const filter =
      req.user.role === 'student'
        ? { studentEmail: req.user.email, role: 'student', read: false }
        : { role: 'teacher', read: false };

    const list = await Notification.findAll(filter);
    return res.json({ count: list.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const list = await Notification.findAll({});
    const item = list.find((n) => n._id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'student' && item.studentEmail !== req.user.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    item.read = true;
    await item.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const filter =
      req.user.role === 'student'
        ? { studentEmail: req.user.email, role: 'student', read: false }
        : { role: 'teacher', read: false };

    const list = await Notification.findAll(filter);
    for (const n of list) {
      n.read = true;
      await n.save();
    }
    return res.json({ ok: true, count: list.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
