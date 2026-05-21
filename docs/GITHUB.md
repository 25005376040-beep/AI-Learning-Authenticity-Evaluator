# Version Control & GitHub Practices

Guidelines for managing **AuthentiViva** with Git and GitHub.

---

## Initial repository setup

```bash
cd ai-authenticity-evaluator
git init
git add .
git commit -m "Initial commit: AuthentiViva AI authenticity evaluator"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

---

## What to commit vs ignore

| ✅ Commit | ❌ Never commit (`.gitignore`) |
|-----------|--------------------------------|
| `client/src/`, `server/` source | `node_modules/` |
| `package.json`, `package-lock.json` | `server/.env` (API keys, JWT secret) |
| `server/.env.example` (placeholders only) | `server/data/` (local JSON database) |
| `docs/`, `README.md` | `server/uploads/` (temp files) |
| `.gitignore` | `client/dist/` build output |

**Critical:** Never commit `GROQ_API_KEY`, `JWT_SECRET`, or real teacher passwords.

---

## Environment secrets workflow

1. Commit `server/.env.example` with placeholder values
2. Each developer copies to `server/.env` locally
3. Add real `GROQ_API_KEY` from [console.groq.com](https://console.groq.com)
4. Document new variables in `docs/ENV.md` and `.env.example`

---

## Branching strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, demo-ready code |
| `feature/<name>` | New features (e.g. `feature/plagiarism-export`) |
| `fix/<name>` | Bug fixes (e.g. `fix/detection-503`) |

For team projects: merge via **pull request**, not direct pushes to `main`.

---

## Commit message style

Use imperative, present tense:

- `Add Groq-only AI detection with retry logic`
- `Fix detection page 503 when API key missing`
- `Update SETUP guide for new laptop install`
- `Add delete student endpoint for teacher dashboard`

---

## Pull request checklist

Before opening a PR:

- [ ] `npm run dev` works in both `server/` and `client/`
- [ ] `GROQ_API_KEY` set locally — upload → detection → viva tested
- [ ] No secrets in `git diff`
- [ ] README / `docs/` updated if behavior or env vars changed
- [ ] `server/.env.example` updated for any new variables

**PR template:**

```markdown
## Summary
- What changed and why

## Test plan
- [ ] Backend health: /api/health shows Groq live
- [ ] Student upload + detection page
- [ ] Full viva + result
- [ ] Teacher dashboard + AI risk report
```

---

## GitHub repository settings (recommended)

| Setting | Recommendation |
|---------|------------------|
| Description | AuthentiViva — AI learning authenticity evaluator with live detection & viva |
| Topics | `education`, `academic-integrity`, `groq`, `nodejs`, `react`, `vite` |
| Issues | Enabled for bug tracking |
| Branch protection | Optional: require PR review on `main` |

---

## Collaborator onboarding

New team member steps:

1. Clone repo
2. Follow [SETUP.md](SETUP.md)
3. Create own `server/.env` (never share keys in Slack/email)
4. Confirm health endpoint shows `"aiMode": "Groq (live analysis)"`

---

## Handling leaked secrets

If `GROQ_API_KEY` or `JWT_SECRET` was committed:

1. **Revoke** the key at Groq console immediately
2. Generate new key and update local `.env`
3. Remove secret from Git history (`git filter-repo` or BFG) — or rotate and treat repo as compromised
4. Never force-push `main` without team agreement

---

## Release tagging (optional)

```bash
git tag -a v1.0.0 -m "AuthentiViva v1.0 — Groq detection + teacher portal"
git push origin v1.0.0
```
