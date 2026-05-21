const { useMockDb, mongoose, MockStudent } = require('../db');

if (useMockDb) {
  module.exports = MockStudent;
} else {
  const studentSchema = new mongoose.Schema({
    fullName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    studentId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
  });

  studentSchema.pre('save', function (next) {
    if (!this.studentId) {
      this.studentId = 'STU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
  });

  studentSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
  };
  studentSchema.statics.findByStudentId = function (studentId) {
    return this.findOne({ studentId });
  };

  studentSchema.statics.deleteByStudentId = async function (studentId) {
    return this.findOneAndDelete({ studentId });
  };

  studentSchema.methods.toPublic = function () {
    return {
      fullName: this.fullName,
      email: this.email,
      studentId: this.studentId,
      createdAt: this.createdAt
    };
  };

  module.exports = mongoose.model('Student', studentSchema);
}
