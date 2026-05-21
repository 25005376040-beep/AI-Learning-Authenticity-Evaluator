const { useMockDb, mongoose, MockExamAttempt } = require('../db');

if (useMockDb) {
  module.exports = MockExamAttempt;
} else {
  const attemptSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    studentId: String,
    studentEmail: String,
    studentName: String,
    status: { type: String, default: 'pending' },
    answers: [{ questionId: String, value: mongoose.Schema.Types.Mixed, savedAt: Date }],
    startedAt: Date,
    submittedAt: Date,
    marksObtained: Number,
    maxMarks: Number,
    percentage: Number,
    teacherFeedback: String,
    teacherComments: String,
    aiGrading: mongoose.Schema.Types.Mixed,
    gradedAt: Date,
    gradedBy: String
  });

  attemptSchema.statics.findAll = function (filter = {}) {
    const q = {};
    if (filter.examId) q.examId = filter.examId;
    if (filter.studentEmail) q.studentEmail = filter.studentEmail;
    if (filter.studentId) q.studentId = filter.studentId;
    if (filter.status) q.status = filter.status;
    return this.find(q);
  };

  attemptSchema.statics.findByExamAndStudent = function (examId, studentId) {
    return this.findOne({ examId, studentId });
  };

  attemptSchema.statics.findById = function (id) {
    return this.findOne({ _id: id });
  };

  module.exports = mongoose.model('ExamAttempt', attemptSchema);
}
