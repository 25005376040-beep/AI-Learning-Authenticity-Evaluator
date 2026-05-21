const { useMockDb, mongoose, MockSession } = require('../db');

if (useMockDb) {
  module.exports = MockSession;
} else {
  const sessionSchema = new mongoose.Schema({
    submissionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    questions:         [{ question: String, generatedAt: { type: Date, default: Date.now } }],
    answers:           [{ answer: String, answeredAt: { type: Date, default: Date.now } }],
    score:             {
      overallScore:        Number,
      depthRating:         String,
      authenticityFlag:    Boolean,
      perQuestionFeedback: [String],
      summary:             String
    },
    language:          { type: String, default: 'en' },
    analytics:         { type: mongoose.Schema.Types.Mixed },
    recommendations:   { type: mongoose.Schema.Types.Mixed },
    studentEmail:      String,
    studentName:       String,
    studentId:         String,
    assignmentTitle:   String,
    status:            { type: String, default: 'in_progress' },
    completedAt:       Date
  });

  sessionSchema.statics.findAll = function (filter = {}) {
    const q = {};
    if (filter.status) q.status = filter.status;
    if (filter.studentEmail) q.studentEmail = filter.studentEmail;
    if (filter.studentId) q.studentId = filter.studentId;
    return this.find(q).sort({ completedAt: -1 });
  };
  module.exports = mongoose.model('Session', sessionSchema);
}
