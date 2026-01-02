# GlamBook AI - Salon Voice Agent & Dashboard

A comprehensive salon booking system with AI-powered voice agent using Eleven Labs for STT/TTS.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React + TS    │────▶│   NestJS + TS   │────▶│  Python FastAPI │
│   Frontend      │     │   Backend       │     │   AI Service    │
│   Port: 5173    │     │   Port: 3001    │     │   Port: 8080    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                       │
                                ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Supabase      │     │   Eleven Labs   │
                        │   PostgreSQL    │     │   Voice API     │
                        └─────────────────┘     └─────────────────┘
```

## Features

### Voice Agent (AI Service)
- **Eleven Labs Integration**: High-quality TTS and STT
- **Booking Agent**: Create, modify, cancel appointments
- **Inquiry Agent**: Answer questions about services, prices, hours
- **Triage Agent**: Route calls to appropriate specialist

### Dashboard

#### Admin Features
- Full appointment management
- Customer management
- Service & pricing configuration
- Staff scheduling
- Analytics & reports
- Call logs & transcripts
- Revenue tracking

#### Customer Features
- View upcoming appointments
- Book new appointments
- Reschedule/cancel appointments
- View service menu
- Update profile
- View booking history

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Query
- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL
- **AI Service**: Python, FastAPI, Eleven Labs SDK, OpenAI Agents
- **Database**: Supabase (PostgreSQL with RLS)
- **Voice**: Eleven Labs API (TTS/STT), Twilio (telephony)

## Quick Start

### 1. Database Setup
```bash
# Push schema to Supabase
cd db
# Copy schema.sql content to Supabase SQL Editor and run
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Configure environment variables
npm install
npx prisma generate
npm run start:dev
```

### 3. AI Service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Configure environment variables
python main.py
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### AI Service (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id
OPENAI_API_KEY=your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Backend (.env)
```env
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
AI_SERVICE_URL=http://localhost:8080
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Roles & Permissions

| Feature | Admin | Customer |
|---------|-------|----------|
| View all appointments | ✅ | ❌ |
| View own appointments | ✅ | ✅ |
| Book appointments | ✅ | ✅ |
| Modify any appointment | ✅ | ❌ |
| Modify own appointment | ✅ | ✅ |
| Manage services | ✅ | ❌ |
| Manage staff | ✅ | ❌ |
| View analytics | ✅ | ❌ |
| Call logs | ✅ | ❌ |
| Customer management | ✅ | ❌ |

## License

MIT
