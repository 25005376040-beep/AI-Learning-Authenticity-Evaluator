# Environment Configuration (`.env`)

All secrets live in **`server/.env`**. Never commit this file to Git.

## Setup

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your values.

---

## Variables

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | `gsk_abc123...` | **Required.** Powers all AI: detection, viva, scoring. Get free key at [console.groq.com](https://console.groq.com) |
| `JWT_SECRET` | `mySuperSecretKey2024!` | Signs student/teacher login tokens. Use a long random string |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Backend port. **Use 5001 on Mac** (port 5000 is used by AirPlay) |

### AI model

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model for all AI tasks |

### Database (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | *(empty)* | MongoDB connection string. **Leave empty** to use local JSON files in `server/data/` |

### Teacher login

| Variable | Default | Description |
|----------|---------|-------------|
| `TEACHER_USERNAME` | `admin` | Teacher portal username |
| `TEACHER_PASSWORD` | `1234` | Teacher portal password |

---

## Example `.env`

```env
PORT=5001
MONGODB_URI=

GROQ_API_KEY=gsk_your_actual_key_from_console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile

JWT_SECRET=authentiviva_change_this_in_production_xyz789
TEACHER_USERNAME=admin
TEACHER_PASSWORD=1234
```

---

## AI behavior

- **No mock mode** — if `GROQ_API_KEY` is missing, upload/viva/detection return error `503`
- **AI detection** uses Groq with JSON mode, 3 retries, evidence-based signals from your actual file text
- Results include `analyzedBy: "Groq"` and model name in stored detection data

---

## Security checklist

- [ ] `.env` is in `.gitignore` (already configured)
- [ ] Never share API keys in chat, screenshots, or commits
- [ ] Rotate `GROQ_API_KEY` if exposed
- [ ] Change `JWT_SECRET` and teacher password for production
- [ ] Only commit `server/.env.example` (no real secrets)

---

## Verify configuration

Start server and visit:

**http://localhost:5001/api/health**

```json
{
  "status": "ok",
  "aiMode": "Groq (live analysis)",
  "aiModel": "llama-3.3-70b-versatile",
  "aiDetection": "Real Groq analysis only (no mock guesses)"
}
```
