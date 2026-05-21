const Notification = require('../models/Notification');

async function createNotification({ studentEmail, studentId, role, type, title, message, link }) {
  return Notification.create({
    studentEmail: studentEmail || null,
    studentId: studentId || null,
    role: role || 'student',
    type: type || 'info',
    title,
    message,
    link: link || null,
    read: false,
    createdAt: new Date()
  });
}

module.exports = { createNotification };
