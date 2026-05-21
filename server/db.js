const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { isAnonymousRecord } = require('./utils/anonymous');

const useMockDb = !process.env.MONGODB_URI;

if (useMockDb) {
  console.log('⚠️  No MONGODB_URI detected. Running database in Local Mock (JSON files) Mode.');
} else {
  console.log('🔌 Connecting to MongoDB at:', process.env.MONGODB_URI);
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected successfully.'))
    .catch((err) => {
      console.error('❌ MongoDB Connection failed:', err.message);
      console.log('⚠️ Falling back to Local Mock (JSON files) Database Mode.');
    });
}

// Custom Mock Database Implementation for zero-setup execution
const DATA_DIR = path.join(__dirname, 'data');
if (useMockDb && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class MockSubmission {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) {
      this._id = Math.random().toString(36).substring(2, 15);
    }
    if (!this.submittedAt) {
      this.submittedAt = new Date();
    }
  }

  static async findById(id) {
    const list = readJSON('submissions.json');
    const doc = list.find(item => item._id === id);
    return doc ? new MockSubmission(doc) : null;
  }

  static async findAll() {
    return readJSON('submissions.json').map((doc) => new MockSubmission(doc));
  }

  static async create(data) {
    const doc = new MockSubmission(data);
    await doc.save();
    return doc;
  }

  async save() {
    const list = readJSON('submissions.json');
    const index = list.findIndex(item => item._id === this._id);
    if (index >= 0) {
      list[index] = { ...this };
    } else {
      list.push({ ...this });
    }
    writeJSON('submissions.json', list);
    return this;
  }
}

class MockSession {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) {
      this._id = Math.random().toString(36).substring(2, 15);
    }
    if (!this.questions) this.questions = [];
    if (!this.answers) this.answers = [];
    if (!this.status) this.status = 'in_progress';
  }

  static async findById(id) {
    const list = readJSON('sessions.json');
    const doc = list.find(item => item._id === id);
    return doc ? new MockSession(doc) : null;
  }

  static async findAll(filter = {}) {
    let list = readJSON('sessions.json');
    if (filter.status) list = list.filter((s) => s.status === filter.status);
    if (filter.studentEmail) list = list.filter((s) => s.studentEmail === filter.studentEmail);
    if (filter.studentId) list = list.filter((s) => s.studentId === filter.studentId);
    return list.map((doc) => new MockSession(doc));
  }

  static async create(data) {
    const doc = new MockSession(data);
    await doc.save();
    return doc;
  }

  async save() {
    const list = readJSON('sessions.json');
    const index = list.findIndex(item => item._id === this._id);
    if (index >= 0) {
      list[index] = { ...this };
    } else {
      list.push({ ...this });
    }
    writeJSON('sessions.json', list);
    return this;
  }
}

class MockStudent {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = Math.random().toString(36).substring(2, 15);
    if (!this.studentId) this.studentId = 'STU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!this.createdAt) this.createdAt = new Date();
  }

  static async findByEmail(email) {
    const list = readJSON('students.json');
    const doc = list.find((item) => item.email?.toLowerCase() === email?.toLowerCase());
    return doc ? new MockStudent(doc) : null;
  }

  static async findByStudentId(studentId) {
    const list = readJSON('students.json');
    const doc = list.find((item) => item.studentId === studentId);
    return doc ? new MockStudent(doc) : null;
  }

  static async findAll() {
    return readJSON('students.json').map((doc) => new MockStudent(doc));
  }

  static async create(data) {
    const doc = new MockStudent(data);
    await doc.save();
    return doc;
  }

  static async deleteByStudentId(studentId) {
    const student = await MockStudent.findByStudentId(studentId);
    if (!student) return null;

    const students = readJSON('students.json').filter((s) => s.studentId !== studentId);
    writeJSON('students.json', students);

    const sessions = readJSON('sessions.json').filter(
      (s) => s.studentEmail !== student.email && s.studentId !== studentId
    );
    writeJSON('sessions.json', sessions);

    const submissions = readJSON('submissions.json').filter(
      (s) => s.studentEmail !== student.email && s.studentId !== studentId
    );
    writeJSON('submissions.json', submissions);

    return student;
  }

  async save() {
    const list = readJSON('students.json');
    const index = list.findIndex((item) => item._id === this._id);
    if (index >= 0) list[index] = { ...this };
    else list.push({ ...this });
    writeJSON('students.json', list);
    return this;
  }

  toPublic() {
    return {
      fullName: this.fullName,
      email: this.email,
      studentId: this.studentId,
      createdAt: this.createdAt
    };
  }
}

/**
 * Remove anonymous / unregistered submissions and related sessions from local JSON DB.
 */
async function purgeAnonymousRecords() {
  if (!useMockDb) {
    return { submissions: 0, sessions: 0, students: 0 };
  }

  const submissions = readJSON('submissions.json');
  const anonymousSubmissionIds = new Set(
    submissions.filter(isAnonymousRecord).map((s) => s._id)
  );

  const keptSubmissions = submissions.filter((s) => !isAnonymousRecord(s));
  const removedSubmissions = submissions.length - keptSubmissions.length;

  const sessions = readJSON('sessions.json');
  const keptSessions = sessions.filter(
    (s) => !isAnonymousRecord(s) && !anonymousSubmissionIds.has(s.submissionId)
  );
  const removedSessions = sessions.length - keptSessions.length;

  const students = readJSON('students.json');
  const keptStudents = students.filter((s) => !isAnonymousRecord(s));
  const removedStudents = students.length - keptStudents.length;

  if (removedSubmissions > 0) writeJSON('submissions.json', keptSubmissions);
  if (removedSessions > 0) writeJSON('sessions.json', keptSessions);
  if (removedStudents > 0) writeJSON('students.json', keptStudents);

  if (removedSubmissions + removedSessions + removedStudents > 0) {
    console.log(
      `🧹 Purged anonymous records: ${removedSubmissions} submission(s), ${removedSessions} session(s), ${removedStudents} student(s)`
    );
  }

  return {
    submissions: removedSubmissions,
    sessions: removedSessions,
    students: removedStudents
  };
}

class MockExam {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = Math.random().toString(36).substring(2, 15);
    if (!this.questions) this.questions = [];
    if (!this.status) this.status = 'draft';
    if (!this.createdAt) this.createdAt = new Date();
  }

  static async findById(id) {
    const doc = readJSON('exams.json').find((e) => e._id === id);
    return doc ? new MockExam(doc) : null;
  }

  static async findAll(filter = {}) {
    let list = readJSON('exams.json');
    if (filter.teacherUsername) {
      list = list.filter((e) => e.teacherUsername === filter.teacherUsername);
    }
    if (filter.status) list = list.filter((e) => e.status === filter.status);
    return list.map((d) => new MockExam(d));
  }

  static async create(data) {
    const doc = new MockExam(data);
    await doc.save();
    return doc;
  }

  toJSON() {
    const plain = {};
    Object.keys(this).forEach((k) => {
      if (typeof this[k] !== 'function') plain[k] = this[k];
    });
    return plain;
  }

  async save() {
    const list = readJSON('exams.json');
    const i = list.findIndex((e) => e._id === this._id);
    const plain = this.toJSON();
    if (i >= 0) list[i] = plain;
    else list.push(plain);
    writeJSON('exams.json', list);
    Object.assign(this, plain);
    return this;
  }
}

class MockExamAttempt {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = Math.random().toString(36).substring(2, 15);
    if (!this.answers) this.answers = [];
    if (!this.status) this.status = 'pending';
  }

  static async findById(id) {
    const doc = readJSON('exam_attempts.json').find((a) => a._id === id);
    return doc ? new MockExamAttempt(doc) : null;
  }

  static async findAll(filter = {}) {
    let list = readJSON('exam_attempts.json');
    if (filter.examId) list = list.filter((a) => a.examId === filter.examId);
    if (filter.studentEmail) {
      list = list.filter(
        (a) => a.studentEmail?.toLowerCase() === filter.studentEmail.toLowerCase()
      );
    }
    if (filter.studentId) list = list.filter((a) => a.studentId === filter.studentId);
    if (filter.status) list = list.filter((a) => a.status === filter.status);
    return list.map((d) => new MockExamAttempt(d));
  }

  static async findByExamAndStudent(examId, studentId) {
    const doc = readJSON('exam_attempts.json').find(
      (a) => a.examId === examId && a.studentId === studentId
    );
    return doc ? new MockExamAttempt(doc) : null;
  }

  static async create(data) {
    const doc = new MockExamAttempt(data);
    await doc.save();
    return doc;
  }

  toJSON() {
    const plain = {};
    Object.keys(this).forEach((k) => {
      if (typeof this[k] !== 'function') plain[k] = this[k];
    });
    return plain;
  }

  async save() {
    const list = readJSON('exam_attempts.json');
    const i = list.findIndex((a) => a._id === this._id);
    const plain = this.toJSON();
    if (i >= 0) list[i] = plain;
    else list.push(plain);
    writeJSON('exam_attempts.json', list);
    Object.assign(this, plain);
    return this;
  }
}

class MockNotification {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = Math.random().toString(36).substring(2, 15);
    if (!this.read) this.read = false;
    if (!this.createdAt) this.createdAt = new Date();
  }

  static async findAll(filter = {}) {
    let list = readJSON('notifications.json');
    if (filter.studentEmail) {
      list = list.filter(
        (n) => n.studentEmail?.toLowerCase() === filter.studentEmail.toLowerCase()
      );
    }
    if (filter.role) list = list.filter((n) => n.role === filter.role);
    if (filter.read === false) list = list.filter((n) => !n.read);
    return list.map((d) => new MockNotification(d)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  static async create(data) {
    const doc = new MockNotification(data);
    await doc.save();
    return doc;
  }

  toJSON() {
    const plain = {};
    Object.keys(this).forEach((k) => {
      if (typeof this[k] !== 'function') plain[k] = this[k];
    });
    return plain;
  }

  async save() {
    const list = readJSON('notifications.json');
    const i = list.findIndex((n) => n._id === this._id);
    const plain = this.toJSON();
    if (i >= 0) list[i] = plain;
    else list.push(plain);
    writeJSON('notifications.json', list);
    Object.assign(this, plain);
    return this;
  }
}

module.exports = {
  useMockDb,
  mongoose,
  readJSON,
  writeJSON,
  MockSubmission,
  MockSession,
  MockStudent,
  MockExam,
  MockExamAttempt,
  MockNotification,
  purgeAnonymousRecords
};
