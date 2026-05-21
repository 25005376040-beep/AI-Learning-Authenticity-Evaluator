# API Reference

**Base URL:** `http://localhost:5001/api`

All JSON bodies unless noted. Student/teacher protected routes require:

```
Authorization: Bearer <jwt_token>
```

---

## Health

### `GET /health`

| Field | Description |
|-------|-------------|
| `status` | `"ok"` |
| `databaseMode` | `"Mock (Local JSON)"` or `"MongoDB Mongoose"` |
| `aiMode` | `"Groq (live analysis)"` or disabled message |
| `aiModel` | Current Groq model |
| `aiDetection` | `"Real Groq analysis only (no mock guesses)"` |

---

## Authentication (`/api/auth`)

### `POST /auth/student/register`

**Body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@university.edu",
  "password": "securePassword123",
  "studentId": "STU001"
}
```

**Response (201):** `{ token, student: { fullName, email, studentId } }`

### `POST /auth/student/login`

**Body:**
```json
{ "email": "jane@university.edu", "password": "securePassword123" }
```

**Response (200):** `{ token, student }`

### `POST /auth/teacher/login`

**Body:**
```json
{ "username": "admin", "password": "1234" }
```

Credentials from `TEACHER_USERNAME` / `TEACHER_PASSWORD` in `.env`.

**Response (200):** `{ token, role: "teacher" }`

---

## Upload & AI detection (`/api/upload`)

### `POST /upload`

Upload file or paste text. Runs **live Groq AI detection** before saving.

**Content-Type:** `multipart/form-data` (file) or `application/json` (text)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | No* | PDF, TXT, or code |
| `text` | String | No* | Pasted content |
| `title` | String | No | Title for pasted text |

\* One of `file` or `text` required.

**Supported extensions:** `.pdf`, `.txt`, `.js`, `.jsx`, `.py`, `.cpp`, `.h`, `.java`, `.ts`, `.tsx`, `.html`, `.css`, `.json`

**Response (201):**
```json
{
  "_id": "submission_id",
  "fileName": "essay.pdf",
  "fileType": "pdf",
  "submittedAt": "2026-05-21T...",
  "aiDetection": {
    "aiProbability": 72,
    "humanProbability": 28,
    "verdict": "Likely AI Generated",
    "confidenceLevel": "High",
    "riskLevel": "High Risk",
    "signals": {
      "aiSignals": ["..."],
      "humanSignals": ["..."]
    },
    "detailedReason": "...",
    "analyzedBy": "Groq",
    "model": "llama-3.3-70b-versatile",
    "detectedAt": "..."
  }
}
```

**Errors:**
- `400` — No file/text or empty extraction
- `503` — `GROQ_API_KEY` missing (includes `hint` URL)

### `GET /upload/:submissionId`

Returns submission metadata and `aiDetection`. Backfills detection for older submissions missing it.

**Response (200):**
```json
{
  "_id": "...",
  "fileName": "...",
  "fileType": "...",
  "aiDetection": { }
}
```

---

## Viva session (`/api/session`)

### `POST /session/start`

**Body:**
```json
{ "submissionId": "<submission _id>" }
```

**Response (201):**
```json
{
  "sessionId": "...",
  "totalQuestions": 5,
  "currentQuestionIndex": 0,
  "question": "First viva question..."
}
```

### `POST /session/answer`

**Body:**
```json
{
  "sessionId": "...",
  "answer": "Student answer text"
}
```

**In progress (200):**
```json
{
  "status": "in_progress",
  "currentQuestionIndex": 2,
  "question": "Adaptive follow-up..."
}
```

**Completed (200):**
```json
{
  "status": "completed",
  "redirect": true,
  "resultUrl": "/result/<sessionId>"
}
```

### `GET /session/:id`

Session state for resume.

### `GET /session/:id/result`

Final score (session must be `completed`).

```json
{
  "sessionId": "...",
  "score": {
    "overallScore": 75,
    "depthRating": "Moderate",
    "authenticityFlag": false,
    "perQuestionFeedback": ["..."],
    "summary": "..."
  },
  "qnas": [{ "question": "...", "answer": "...", "feedback": "..." }],
  "completedAt": "..."
}
```

---

## Student (`/api/student`) — requires student JWT

### `GET /student/sessions`

List viva sessions for logged-in student.

---

## Teacher (`/api/teacher`) — requires teacher JWT

### `GET /teacher/dashboard`

Overview stats (students, sessions, AI flags).

### `GET /teacher/students`

All registered students.

### `GET /teacher/sessions`

All viva sessions with submission info.

### `GET /teacher/ai-risk-report`

Submissions grouped by AI detection risk (High / Medium / Low).

### `GET /teacher/sessions/:id`

Single session detail with Q&A and scores.

### `GET /teacher/students/:studentId/history`

Submission and session history for one student.

### `DELETE /teacher/students/:studentId`

Delete student account (and related data in mock DB).

**Response (200):** `{ message: "Student deleted successfully" }`

---

## Error format

```json
{
  "error": "Human-readable message",
  "hint": "Optional setup hint (e.g. Groq API key)"
}
```

Common status codes: `400` validation, `401` unauthorized, `404` not found, `503` AI disabled.
