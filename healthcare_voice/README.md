# Healthcare Voice

A full-stack voice AI application for healthcare appointment scheduling and patient services. Features a browser-based voice agent using OpenAI's Realtime API with WebSocket communication.

**Last Updated:** January 9, 2026

## Features

- **Voice Agent**: Browser-based real-time voice conversations using OpenAI Realtime API
- **Appointment Scheduling**: Book, reschedule, and cancel appointments via voice
- **Patient Management**: Look up patients, view appointments, and manage records
- **Provider Directory**: View providers, specializations, and availability
- **Call Logging**: Track all voice interactions with transcripts and summaries
- **Admin Dashboard**: Real-time overview of appointments, patients, and calls

## Architecture

```
healthcare_voice/
├── ai-service/          # Python FastAPI - Voice AI & WebSocket server
│   ├── agents/          # Healthcare voice agent tools
│   ├── routes/          # API endpoints (voice, patients, appointments)
│   └── db/              # Supabase database queries
├── backend/             # Node.js NestJS - REST API server
│   ├── src/             # API modules (auth, patients, appointments, etc.)
│   └── prisma/          # Database schema
├── frontend/            # React + Vite - Admin dashboard & voice interface
│   └── src/
│       ├── pages/       # Dashboard, Appointments, Patients, Voice Agent
│       └── components/  # Reusable UI components
├── database/            # SQL schema for Supabase
└── docker-compose.yml   # Container orchestration
```

## Tech Stack

- **AI Service**: Python, FastAPI, OpenAI Realtime API, WebSockets
- **Backend**: Node.js, NestJS, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Voice**: OpenAI Realtime API (WebSocket-based)

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL (or Supabase account)
- OpenAI API key with Realtime API access

## Quick Start

### 1. Clone and Setup

```bash
cd healthcare_voice
cp .env.example .env
# Edit .env with your credentials
```

### 2. Database Setup

Run the SQL schema in Supabase SQL Editor:
```bash
# Copy contents of database/schema.sql to Supabase SQL Editor
# This creates all tables and sample data
```

### 3. Start Services

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Manual**

AI Service:
```bash
cd ai-service
pip install -r requirements.txt
python main.py
```

Backend:
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### 4. Create Admin User

```bash
# Via API
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sunrisehealthcare.com",
    "password": "password",
    "firstName": "Admin",
    "lastName": "User",
    "practiceId": "00000000-0000-0000-0000-000000000001"
  }'
```

### 5. Access Application

- **Frontend**: http://localhost:5176
- **Backend API**: http://localhost:3005/api
- **AI Service**: http://localhost:8084

## Voice Agent Features

The voice agent can:

1. **Patient Lookup**: Find patients by name + DOB or phone number
2. **View Appointments**: Check upcoming appointments
3. **Schedule Appointments**: Book new appointments with available providers
4. **Reschedule/Cancel**: Modify existing appointments
5. **Provider Info**: Get information about doctors and their availability
6. **Office Hours**: Provide practice hours and contact information
7. **New Patient Registration**: Register new patients

### Voice Commands Examples

- "I'd like to schedule an appointment"
- "What appointments do I have coming up?"
- "Can I reschedule my appointment with Dr. Johnson?"
- "Who are your dentists?"
- "What are your office hours?"

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient
- `GET /api/patients/:id/appointments` - Patient appointments

### Appointments
- `GET /api/appointments` - List appointments
- `GET /api/appointments/today` - Today's schedule
- `GET /api/appointments/availability` - Check availability
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id/cancel` - Cancel
- `PUT /api/appointments/:id/reschedule` - Reschedule

### Providers
- `GET /api/providers` - List providers
- `GET /api/providers/:id` - Provider details with schedule

### Voice (AI Service)
- `WS /voice/ws` - WebSocket for real-time voice
- `GET /patients/` - Search patients
- `GET /appointments/` - Appointments API

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| OPENAI_API_KEY | OpenAI API key | Yes |
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_KEY | Supabase service role key | Yes |
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| DEFAULT_PRACTICE_ID | Default practice UUID | No |

## Database Schema

Key tables:
- `practices` - Healthcare practices/clinics
- `providers` - Doctors, dentists, specialists
- `patients` - Patient demographics
- `appointments` - Scheduled visits
- `patient_insurance` - Insurance coverage
- `services` - Medical services/procedures
- `call_logs` - Voice agent call history

## Development

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
DEBUG=true python main.py
```

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Docker Production
```bash
docker-compose -f docker-compose.yml up -d --build
```

### Individual Services
Each service has its own Dockerfile for independent deployment.

## Security Notes

- All endpoints require JWT authentication (except auth routes)
- Patient data is protected with Row Level Security in Supabase
- Voice sessions create audit logs in `call_logs` table
- Sensitive data (SSN) stored as last 4 digits only

## License

Proprietary - All rights reserved
