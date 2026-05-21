# AuthentiViva Documentation

Documentation for the **AI Learning Authenticity Evaluator** (AuthentiViva).

## Quick links

| Document | Description |
|----------|-------------|
| [../README.md](../README.md) | Project overview & quick start |
| [SETUP.md](SETUP.md) | **Full setup on a new laptop/PC** (Windows, Mac, Linux) |
| [DEPENDENCIES.md](DEPENDENCIES.md) | System requirements & npm packages |
| [ENV.md](ENV.md) | Environment variables (`.env`) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, flows, folder structure |
| [API.md](API.md) | REST API reference |
| [GITHUB.md](GITHUB.md) | Git & GitHub best practices |

## For new developers

1. Install Node.js 18+ → [SETUP.md § Step 1](SETUP.md#step-1--install-nodejs)
2. `npm install` in `server/` and `client/`
3. Copy `server/.env.example` → `server/.env` and add **Groq API key**
4. Run backend + frontend → [SETUP.md § Steps 6–7](SETUP.md#step-6--start-the-backend)
5. Test at `http://localhost:5173`

## Key facts

- **AI provider:** Groq (`llama-3.3-70b-versatile`) — not Gemini
- **AI detection:** Real analysis only; no mock/heuristic guesses
- **Database:** Local JSON by default; MongoDB optional
- **Ports:** API `5001`, frontend `5173` (or `5174`)
- **Teacher login:** `admin` / `1234` (configurable in `.env`)
