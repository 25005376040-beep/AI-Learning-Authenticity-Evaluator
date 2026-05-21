const { useMockDb, mongoose, MockExam } = require('../db');

if (useMockDb) {
  module.exports = MockExam;
} else {
  const examSchema = new mongoose.Schema({
    teacherUsername: String,
    title: String,
    subject: String,
    topic: String,
    instructions: String,
    questions: [{ id: String, type: String, question: String, options: [String], marks: Number, correctOption: String }],
    status: { type: String, default: 'draft' },
    dueDate: Date,
    startTime: Date,
    endTime: Date,
    attemptLimit: { type: Number, default: 1 },
    totalMarks: Number,
    createdAt: { type: Date, default: Date.now },
    assignedAt: Date
  });

  examSchema.statics.findAll = function (filter = {}) {
    const q = {};
    if (filter.teacherUsername) q.teacherUsername = filter.teacherUsername;
    if (filter.status) q.status = filter.status;
    return this.find(q).sort({ createdAt: -1 });
  };

  examSchema.statics.findById = function (id) {
    return this.findOne({ _id: id });
  };

  module.exports = mongoose.model('Exam', examSchema);
}
