require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const uploadRoutes = require('./routes/upload');
const sessionRoutes = require('./routes/session');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const teacherExamRoutes = require('./routes/teacherExams');
const studentExamRoutes = require('./routes/studentExams');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads if needed (for debugging/logs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher/exams', teacherExamRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/student/exams', studentExamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/session', sessionRoutes);

// Base route / health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseMode: db.useMockDb ? 'Mock (Local JSON)' : 'MongoDB Mongoose',
    aiMode: (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('your_') || process.env.GROQ_API_KEY.startsWith('mock'))
      ? 'DISABLED — set GROQ_API_KEY in server/.env'
      : 'Groq (live analysis)',
    aiModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    aiDetection: 'Real Groq analysis only (no mock guesses)'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express server error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Remove legacy anonymous records from local DB on startup
if (db.useMockDb && db.purgeAnonymousRecords) {
  db.purgeAnonymousRecords().catch((err) => {
    console.error('❌ Anonymous purge failed:', err.message);
  });
}

// Start listening (use 5001 on Mac — port 5000 is often used by AirPlay Receiver)
const server = app.listen(PORT, () => {
  console.log(`🚀 AI Authenticity Evaluator server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    if (PORT === 5000) {
      console.error('   On macOS, port 5000 is often taken by AirPlay. Set PORT=5001 in server/.env');
    }
    console.error('   Stop the other process or change PORT in server/.env and client/vite.config.js');
  } else {
    console.error('❌ Server failed to start:', err.message);
  }
  process.exit(1);
});
