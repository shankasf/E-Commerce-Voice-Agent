# Quiz Application

A production-ready exam-mode quiz application with anti-cheating enforcement, AI-powered question import, and full administrative controls.

## Features

### User Quiz App
- Email OTP authentication
- Fullscreen enforcement mode
- Anti-cheating detection (tab switch, window blur, copy/paste, etc.)
- Automatic quiz restart on violations
- Timer with auto-submit
- Real-time event logging
- Results with email notifications

### Admin Portal
- Dashboard with metrics
- Attempt viewer with event timeline
- Quiz management (CRUD)
- Question editor
- CSV/PDF import with AI processing
- Export functionality

### Backend
- Express.js API with JWT authentication
- Supabase integration (Auth, Database, Storage)
- Row Level Security policies
- Email notifications (SES/SMTP)

### AI Service
- FastAPI with OpenAI Agents SDK
- PDF and CSV question extraction
- Structured output validation
- Automatic quiz generation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Port 80/443)                      │
│  /        → web (3000)    /admin → admin (3001)                 │
│  /api/*   → api (4000)    /ai/*  → ai (8000)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
quiz/
├── apps/
│   ├── web/              # React User Quiz App
│   └── admin/            # React Admin Portal
├── services/
│   ├── api/              # Express.js Backend
│   └── ai/               # Python AI Service
├── supabase/
│   └── migrations/       # SQL migrations
├── nginx/                # NGINX configuration
├── docs/                 # Documentation
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Supabase account

### Development Setup

1. Clone and install dependencies:
```bash
# API
cd services/api && npm install

# Web App
cd apps/web && npm install

# Admin App
cd apps/admin && npm install

# AI Service
cd services/ai && pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run Supabase migrations in the SQL Editor

4. Start development servers:
```bash
# API
cd services/api && npm run dev

# Web (in another terminal)
cd apps/web && npm run dev

# Admin (in another terminal)
cd apps/admin && npm run dev

# AI (in another terminal)
cd services/ai && python main.py
```

### Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

```bash
# Quick start
docker-compose build
docker-compose up -d
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only) |
| `SUPABASE_JWT_SECRET` | JWT secret for verification |
| `VITE_SUPABASE_URL` | Supabase URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (frontend) |
| `OPENAI_API_KEY` | OpenAI API key for AI service |
| `EMAIL_PROVIDER` | `ses` or `smtp` |

## API Endpoints

### User API
- `POST /api/attempts/start` - Start a quiz attempt
- `POST /api/attempts/restart` - Restart (abandons current)
- `POST /api/attempts/submit` - Submit completed attempt
- `POST /api/answers/upsert` - Save answer
- `POST /api/events/batch` - Log events

### Admin API
- `GET /api/admin/metrics` - Dashboard metrics
- `GET /api/admin/attempts` - List attempts
- `GET /api/admin/attempts/:id` - Attempt details
- CRUD endpoints for quizzes and questions
- Import/export endpoints

## Database Schema

- `profiles` - User profiles (1:1 with auth.users)
- `user_roles` - Admin/editor roles
- `quizzes` - Quiz definitions
- `questions` - Quiz questions
- `attempts` - User quiz attempts
- `attempt_answers` - User answers
- `attempt_events` - Event logs
- `imports` - File import records

All tables have Row Level Security enabled.

## Anti-Cheat Features

The quiz enforces exam mode with:
- Fullscreen requirement
- Tab switch detection
- Window blur detection
- Clipboard blocking
- Context menu blocking
- Text selection blocking
- Back button handling
- All events logged with timestamps

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **AI Service**: Python, FastAPI, OpenAI Agents SDK
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email OTP)
- **Storage**: Supabase Storage
- **Deployment**: Docker, NGINX, Let's Encrypt

## License

MIT
