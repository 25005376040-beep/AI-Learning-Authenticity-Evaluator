const { useMockDb, mongoose, MockSubmission } = require('../db');

if (useMockDb) {
  module.exports = MockSubmission;
} else {
  const submissionSchema = new mongoose.Schema({
    studentId:     String,
    studentEmail:  String,
    studentName:   String,
    fileName:      String,
    fileType:      String,
    extractedText: String,
    submittedAt:   { type: Date, default: Date.now },
    aiDetection: {
      aiProbability:    Number,
      humanProbability: Number,
      verdict:          String,
      confidenceLevel:  String,
      signals: {
        aiSignals:    [String],
        humanSignals: [String]
      },
      detailedReason: String,
      riskLevel:      String,
      detectedAt:     Date
    }
  });

  submissionSchema.statics.findAll = function () {
    return this.find();
  };

  module.exports = mongoose.model('Submission', submissionSchema);
}
