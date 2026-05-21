# AuthentiViva — AI Learning Authenticity Evaluator

A full-stack academic integrity platform that verifies whether students truly understand their submitted work through **live AI analysis**, **oral viva examinations**, and **teacher oversight**.

## What it does

| Feature | Description |
|---------|-------------|
| **AI Content Detection** | Real Groq LLM analysis of every upload — detects AI-generated vs human-written work with evidence-based signals |
| **Adaptive Viva** | 5 oral-exam questions with follow-ups that adapt to each answer |
| **Understanding Score** | 0–100 score, depth rating, authenticity flag, per-question feedback |
| **Student Portal** | Register, login, dashboard, session history |
| **Teacher Portal** | Dashboard, session review, AI risk report, delete students (`admin` / `1234`) |

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 18, Vite, Tailwind CSS 4, React Router |
| Backend | Node.js, Express, JWT, bcrypt, Multer, pdf-parse |
| AI | **Groq API** (`llama-3.3-70b-versatile`) — live analysis only, no mock guesses |
| Database | MongoDB (optional) or local JSON files in `server/data/` |

## Requirements

- **Node.js** 18 or newer
- **npm** 9 or newer
- **Groq API key** (required) — free at [console.groq.com](https://console.groq.com)
- **MongoDB** (optional)

See [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).

## Quick start (new PC)

```bash
# 1. Clone or copy the project folder
cd ai-authenticity-evaluator

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Configure environment
cd ../server
cp .env.example .env
# Edit .env — add your GROQ_API_KEY (required)

# 4. Run backend (Terminal 1)
npm run dev

# 5. Run frontend (Terminal 2)
cd ../client
npm run dev
```

Open **http://localhost:5173** (or the port Vite prints).

Full guide: [docs/SETUP.md](docs/SETUP.md)

## Environment configuration

Copy `server/.env.example` → `server/.env`. **Required:**

```env
GROQ_API_KEY=gsk_your_key_here
JWT_SECRET=change_this_to_a_long_random_string
```

See [docs/ENV.md](docs/ENV.md) for all variables.

## Folder structure

```
ai-authenticity-evaluator/
├── README.md
├── .gitignore
├── docs/                          # Project documentation
│   ├── SETUP.md                   # New laptop setup guide
│   ├── DEPENDENCIES.md            # Requirements & packages
│   ├── ENV.md                     # Environment variables
│   ├── ARCHITECTURE.md            # System design
│   ├── API.md                     # REST API reference
│   └── GITHUB.md                  # Version control practices
├── client/                        # React frontend
│   ├── src/
│   │   ├── api/                   # Axios client + JWT
│   │   ├── context/               # AuthContext
│   │   ├── components/            # UI components
│   │   └── pages/                 # All screens
│   └── vite.config.js
└── server/                        # Express API
    ├── .env.example
    ├── index.js
    ├── db.js                      # Mock JSON or MongoDB
    ├── data/                      # Local DB (gitignored runtime data)
    ├── models/
    ├── routes/
    ├── services/gemini.js         # Groq AI engine
    └── middleware/
```

## Default accounts

| Role | Credentials |
|------|-------------|
| Teacher | Username: `admin` · Password: `1234` |
| Student | Register at `/student/register` |

Change teacher credentials in `server/.env` (`TEACHER_USERNAME`, `TEACHER_PASSWORD`).

## Application flow

1. Student uploads file (PDF, code, text)
2. **Groq analyzes** submission for AI content → detection results page
3. Student proceeds to **5-question viva**
4. Groq scores answers → result page
5. Teacher views sessions, AI detection, and risk report

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/SETUP.md](docs/SETUP.md) | Full setup on a new Windows/Mac/Linux PC |
| [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) | System & npm requirements |
| [docs/ENV.md](docs/ENV.md) | `.env` configuration |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture & data flow |
| [docs/API.md](docs/API.md) | API endpoints |
| [docs/GITHUB.md](docs/GITHUB.md) | Git & GitHub practices |

## Version control

```bash
git init
git add .
git commit -m "Initial commit: AuthentiViva"
```

Never commit `server/.env` or API keys. See [docs/GITHUB.md](docs/GITHUB.md).

## Health check

After starting the server: [http://localhost:5001/api/health](http://localhost:5001/api/health)

Should show `"aiMode": "Groq (live analysis)"` when your API key is configured.

## License

Academic / team project.
