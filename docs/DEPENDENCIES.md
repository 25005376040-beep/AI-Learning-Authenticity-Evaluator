# Requirements & Dependencies

## System requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Operating system** | Windows 10, macOS 11, or Linux | Latest stable |
| **Node.js** | 18.x | 20.x LTS |
| **npm** | 9.x | 10.x (bundled with Node) |
| **RAM** | 4 GB | 8 GB+ |
| **Disk space** | 500 MB free | 1 GB+ |
| **Internet** | Required | Required for Groq API |

## Required services

| Service | Required? | Purpose | Get it |
|---------|-----------|---------|--------|
| **Groq API** | **Yes** | AI detection, viva questions, scoring | [console.groq.com](https://console.groq.com) |
| **MongoDB** | No | Persistent database | [mongodb.com/atlas](https://www.mongodb.com/atlas) or local install |

Without `GROQ_API_KEY`, upload and viva **will not work** (no mock/fake results).

## Backend packages (`server/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21 | HTTP API server |
| cors | ^2.8 | Cross-origin requests |
| dotenv | ^16.4 | Load `.env` variables |
| groq-sdk | ^1.2 | **Live Groq AI** (detection, viva, scoring) |
| jsonwebtoken | ^9.0 | JWT authentication |
| bcryptjs | ^3.0 | Password hashing |
| mongoose | ^8.8 | MongoDB ODM (optional) |
| multer | ^1.4 | File uploads |
| pdf-parse | ^1.1 | PDF text extraction |
| nodemon | ^3.1 | Dev auto-reload (dev only) |

Install:

```bash
cd server
npm install
```

## Frontend packages (`client/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react / react-dom | ^18.3 | UI |
| react-router-dom | ^6.28 | Routing |
| axios | ^1.7 | API requests |
| jwt-decode | ^3.x | JWT helpers |
| lucide-react | ^0.460 | Icons |
| react-markdown | ^9.0 | Markdown rendering |
| vite | ^6.0 | Dev server & build |
| tailwindcss | ^4.0 | Styling |

Install:

```bash
cd client
npm install
```

## Verify installation

```bash
node -v    # should print v18.x or higher
npm -v     # should print 9.x or higher
```

## Ports used

| Port | Service |
|------|---------|
| 5001 | Backend API (default; avoid 5000 on Mac — AirPlay uses it) |
| 5173 | Frontend (Vite; may use 5174 if busy) |
