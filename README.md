# AI Video Studio — Full-Stack Next.js Application

AI Video Studio is a full-stack Next.js application that transforms text scripts into rendered, bilingual AI videos with voiceovers, animated captions, dynamic scene asset selection, real-time WebSocket progress tracking, MongoDB persistence, and local MP4 streaming.

---

## 🚀 Features

- **End-to-End AI Video Generation**: Script analysis with Gemini / OpenAI / Anthropic, asset searching via Pexels, edge TTS generation, animated ASS subtitle rendering, and multi-scene FFmpeg composition.
- **Unified Full-Stack Architecture**: Next.js App Router for frontend UI and backend API routes in a single unified project.
- **Real-Time Progress**: Native Socket.IO WebSocket server integrated with custom Node.js HTTP server.
- **Authentication & RBAC**: JWT Access + Refresh token flow with User, Pro, and Admin roles.
- **Dynamic Key Rotation & BYOK**: Gemini rotator fallback with Bring-Your-Own-Key per user.
- **Admin Dashboard**: User management, quota allocation, system metrics, and asset browser.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI / Styling**: React 19, Tailwind CSS v4, Lucide Icons, Shadcn UI / Base-UI primitives
- **Real-Time**: Socket.IO & Socket.IO Client
- **Database**: MongoDB Native Driver (with singleton connection pooling)
- **Video Engine**: FFmpeg static, Edge TTS, ASS Subtitles generator
- **Storage**: Local Disk Storage & Static Byte-Range Video Streaming (/public/videos)

---

## 📡 API Endpoints

### System & Health
- `GET /api/health` -> `{ "success": true, "service": "AI Video Studio", "status": "running", ... }`

### Video Generation & Management
- `POST /api/generate` -> Generates video from script (supports realtime WS updates)
  - Returns: `{ "success": true, "videoUrl": "/videos/...", "filename": "...", "duration": 14.5 }`
- `GET /api/videos` -> List user videos (paginated)
- `GET /api/videos/:id` -> Get video details / stream
- `GET /api/jobs/:jobId` -> Query background generation status

### Authentication & Keys
- `POST /api/auth/register` -> Register new user
- `POST /api/auth/login` -> Login & receive access + refresh tokens
- `POST /api/auth/refresh` -> Refresh expired access token
- `GET /api/auth/me` -> Current authenticated user profile
- `POST /api/auth/logout` -> Invalidate session
- `POST /api/auth/keys` -> Save user custom AI API keys (BYOK)

### Admin Management
- `GET /api/admin/dashboard` -> System statistics & resource counters
- `GET /api/admin/users` -> List & filter all registered users
- `PATCH /api/admin/users/:id` -> Update user role, status, quota
- `GET /api/admin/assets` -> Scraped and uploaded asset catalog

---

## 🏃 Running Locally

```bash
# Install dependencies
pnpm install

# Install TTS dependencies used by video generation
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# Run development server with WebSockets
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Default URL: `http://localhost:3000`
