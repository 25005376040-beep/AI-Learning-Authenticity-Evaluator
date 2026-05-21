const { useMockDb, mongoose, MockNotification } = require('../db');

if (useMockDb) {
  module.exports = MockNotification;
} else {
  const notificationSchema = new mongoose.Schema({
    studentEmail: String,
    studentId: String,
    role: { type: String, default: 'student' },
    type: String,
    title: String,
    message: String,
    link: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });

  notificationSchema.statics.findAll = function (filter = {}) {
    const q = {};
    if (filter.studentEmail) q.studentEmail = filter.studentEmail;
    if (filter.role) q.role = filter.role;
    if (filter.read === false) q.read = false;
    return this.find(q).sort({ createdAt: -1 });
  };

  module.exports = mongoose.model('Notification', notificationSchema);
}
