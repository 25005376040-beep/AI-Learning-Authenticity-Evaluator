const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const upload = require('../middleware/upload');
const Submission = require('../models/Submission');
const { authMiddleware, studentOnly, optionalAuth } = require('../middleware/auth');
const { detectAIContent } = require('../services/gemini');

const MAX_STORED_TEXT = 80000;

function trimExtractedText(text) {
  const s = String(text).trim();
  if (s.length <= MAX_STORED_TEXT) return s;
  return s.slice(0, MAX_STORED_TEXT) + '\n\n[Document truncated — first portion used for viva]';
}

async function processUpload(req, res) {
  try {
    let extractedText = '';
    let fileName = 'Pasted Text';
    let fileType = 'text';
    if (!req.user?.studentId) {
      return res.status(401).json({ error: 'Student login required to upload.' });
    }

    const studentId = req.user.studentId;
    const studentEmail = req.user.email;
    const studentName = req.user.fullName;

    if (req.file) {
      fileName = req.file.originalname;
      const filePath = req.file.path;
      const ext = path.extname(fileName).toLowerCase();

      try {
        if (ext === '.pdf') {
          fileType = 'pdf';
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdf(dataBuffer);
          extractedText = pdfData.text;
        } else {
          fileType = ['.js', '.jsx', '.py', '.cpp', '.h', '.java', '.ts', '.tsx', '.html', '.css', '.json'].includes(ext)
            ? 'code'
            : 'text';
          extractedText = fs.readFileSync(filePath, 'utf8');
        }
      } catch (parseError) {
        console.error('❌ Parsing failed:', parseError.message);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: `Could not extract text from file: ${parseError.message}` });
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (req.body.text && String(req.body.text).trim()) {
      extractedText = req.body.text;
      fileName = req.body.title || 'Pasted Content';
      fileType = 'text';
    } else {
      return res.status(400).json({ error: 'No file uploaded or text provided.' });
    }

    if (!extractedText || !String(extractedText).trim()) {
      return res.status(400).json({ error: 'Extracted content is empty or invalid.' });
    }

    const trimmedText = trimExtractedText(extractedText);

    console.log('🔍 Running AI content detection...');
    const aiDetection = await detectAIContent(trimmedText);
    aiDetection.detectedAt = new Date();

    const submission = await Submission.create({
      studentId,
      studentEmail,
      studentName,
      fileName,
      fileType,
      extractedText: trimmedText,
      submittedAt: new Date(),
      aiDetection
    });

    console.log(`✅ Submission created successfully: ${submission._id} (${fileName})`);
    return res.status(201).json({
      _id: submission._id,
      studentId: submission.studentId,
      fileName: submission.fileName,
      fileType: submission.fileType,
      submittedAt: submission.submittedAt,
      aiDetection,
      message: 'File uploaded and analyzed successfully'
    });
  } catch (err) {
    console.error('❌ Submission creation failed:', err.message, err.stack);
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Internal server error during upload.',
      hint:
        status === 503
          ? 'Add a valid GROQ_API_KEY to server/.env from https://console.groq.com'
          : status === 429
            ? 'Groq daily limit reached. Wait ~25 min or set GROQ_FALLBACK_MODEL=llama-3.1-8b-instant in server/.env'
            : undefined,
      retryAfterSec: err.retryAfterSec
    });
  }
}

async function ensureDetection(submission) {
  if (submission.aiDetection?.verdict) {
    return submission.aiDetection;
  }
  if (!submission.extractedText?.trim()) {
    return null;
  }
  console.log(`🔍 Re-running AI detection for submission ${submission._id}...`);
  const aiDetection = await detectAIContent(submission.extractedText);
  aiDetection.detectedAt = new Date();
  submission.aiDetection = aiDetection;
  await submission.save();
  return aiDetection;
}

router.get('/:submissionId', optionalAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found. Please upload again.' });
    }

    const aiDetection = await ensureDetection(submission);

    return res.json({
      _id: submission._id,
      fileName: submission.fileName,
      fileType: submission.fileType,
      aiDetection
    });
  } catch (err) {
    console.error('❌ Fetch submission failed:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Failed to load detection results.',
      hint:
        status === 503
          ? 'Add a valid GROQ_API_KEY to server/.env from https://console.groq.com'
          : status === 429
            ? 'Groq daily limit reached. Wait or set GROQ_FALLBACK_MODEL=llama-3.1-8b-instant in server/.env'
            : undefined,
      retryAfterSec: err.retryAfterSec
    });
  }
});

router.post('/', authMiddleware, studentOnly, (req, res) => {
  if (req.is('multipart/form-data')) {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err.message);
        return res.status(400).json({ error: err.message });
      }
      processUpload(req, res);
    });
  } else {
    processUpload(req, res);
  }
});

module.exports = router;
