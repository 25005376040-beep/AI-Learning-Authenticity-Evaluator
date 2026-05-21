# Setup & Run Guide — New Laptop / PC

Complete guide to run **AuthentiViva** on a fresh Windows, Mac, or Linux machine.

---

## Step 1 — Install Node.js

### Windows
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download **LTS** (20.x recommended)
3. Run installer → check **"Add to PATH"**
4. Open **Command Prompt** or **PowerShell**:

```bash
node -v
npm -v
```

### macOS
```bash
# Option A: Official installer from nodejs.org

# Option B: Homebrew
brew install node
```

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

---

## Step 2 — Get the project

### From GitHub
```bash
git clone <your-repo-url>
cd ai-authenticity-evaluator
```

### From ZIP
1. Extract the folder
2. Open terminal in `ai-authenticity-evaluator`

---

## Step 3 — Install dependencies

**Terminal 1:**
```bash
cd server
npm install
```

**Terminal 2 (or same terminal after):**
```bash
cd client
npm install
```

Wait until both finish without errors.

---

## Step 4 — Get a Groq API key (required)

1. Open [https://console.groq.com](https://console.groq.com)
2. Sign up / log in
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_`)

---

## Step 5 — Configure environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with any text editor:

```env
PORT=5001
MONGODB_URI=
GROQ_API_KEY=gsk_paste_your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
JWT_SECRET=use_a_long_random_secret_string_here
TEACHER_USERNAME=admin
TEACHER_PASSWORD=1234
```

| Variable | Required | Notes |
|----------|----------|-------|
| `GROQ_API_KEY` | **Yes** | All AI is live Groq — no fake detection |
| `JWT_SECRET` | **Yes** | Any long random string |
| `PORT` | No | Use `5001` (Mac: avoid `5000`) |
| `MONGODB_URI` | No | Leave empty for local JSON database |

See [ENV.md](ENV.md) for details.

---

## Step 6 — Start the backend

```bash
cd server
npm run dev
```

You should see:
```
🤖 Groq AI client initialized using model 'llama-3.3-70b-versatile'.
🚀 AI Authenticity Evaluator server running on http://localhost:5001
```

**Verify:** open [http://localhost:5001/api/health](http://localhost:5001/api/health)

Expected:
```json
{
  "status": "ok",
  "aiMode": "Groq (live analysis)",
  "aiDetection": "Real Groq analysis only (no mock guesses)"
}
```

If `aiMode` says `DISABLED`, your `GROQ_API_KEY` is missing or invalid.

---

## Step 7 — Start the frontend

**New terminal** (keep backend running):

```bash
cd client
npm run dev
```

Open the URL shown (usually [http://localhost:5173](http://localhost:5173)).

---

## Step 8 — Test the app

### Teacher
1. Click **I'm a Teacher**
2. Login: `admin` / `1234`
3. View dashboard, sessions, AI Risk Report

### Student
1. Click **I'm a Student** → **Register**
2. Login → **Start New Viva**
3. Upload a file → wait for **AI detection** (real Groq analysis)
4. **Proceed to Viva** → answer 5 questions → view results

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: npm` | Reinstall Node.js, restart terminal |
| Port 5001 in use | Change `PORT` in `.env` and `target` in `client/vite.config.js` |
| `GROQ_API_KEY is required` | Add real key to `server/.env`, restart server |
| Mac port 5000 conflict | Always use port **5001** |
| Upload timeout | Large PDFs take longer; wait up to 2 minutes |
| Detection page error | Restart server; upload again (don't use old URLs) |
| Frontend can't reach API | Ensure backend runs on same port as `vite.config.js` proxy |
| `Cannot DELETE` teacher route | Restart backend after code updates |

---

## Stop the app

Press `Ctrl + C` in each terminal.

---

## Production build (optional)

```bash
cd client
npm run build
# Serve dist/ with any static host; proxy /api to backend
```

```bash
cd server
npm start
```
