const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

router.post('/student/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    const existing = await Student.findByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const student = await Student.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: hashed
    });

    const publicStudent = student.toPublic ? student.toPublic() : {
      fullName: student.fullName,
      email: student.email,
      studentId: student.studentId
    };

    const token = signToken({
      role: 'student',
      email: publicStudent.email,
      studentId: publicStudent.studentId,
      fullName: publicStudent.fullName
    });

    return res.status(201).json({ token, student: publicStudent });
  } catch (err) {
    console.error('❌ Register failed:', err.message);
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const student = await Student.findByEmail(email.trim());
    if (!student) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, student.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const publicStudent = student.toPublic ? student.toPublic() : {
      fullName: student.fullName,
      email: student.email,
      studentId: student.studentId
    };

    const token = signToken({
      role: 'student',
      email: publicStudent.email,
      studentId: publicStudent.studentId,
      fullName: publicStudent.fullName
    });

    return res.json({ token, student: publicStudent });
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

router.post('/teacher/login', (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.TEACHER_USERNAME || 'admin';
  const expectedPass = process.env.TEACHER_PASSWORD || '1234';

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: 'Invalid teacher credentials.' });
  }

  const token = signToken({ role: 'teacher', username: expectedUser });
  return res.json({ token, role: 'teacher', username: expectedUser });
});

module.exports = router;
