# GTM Outreach Strategy App

A full-stack application for viewing and querying CallSphere's Go-To-Market segmentation strategy. Features user authentication, organized data views, and an AI-powered chatbot.

## Features

- **User Authentication**: Email/password signup & login + Google OAuth
- **Dashboard**: Overview of all 5 industries and 10 market segments
- **Industry Views**: Detailed view of each industry with markets and segments
- **Segment Details**: Complete buyer persona, pain profile, urgency triggers, Apollo filters, and messaging guidance
- **AI Chatbot**: Ask questions about any part of the GTM strategy using OpenAI GPT
- **Search**: Quick search across industries, segments, titles, and keywords

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt + Google OAuth (passport.js)
- **AI**: OpenAI GPT-4o-mini

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- (Optional) Google OAuth credentials

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL, JWT secret, and API keys

npm install
npm run db:generate
npm run db:push
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/gtm_outreach"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="sk-..."
GOOGLE_CLIENT_ID="..."  # optional
GOOGLE_CLIENT_SECRET="..."  # optional
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

## Data Structure

The app contains GTM strategy data for 5 industries:

1. **Healthcare & Dental** - Multi-location dental chains, urgent care clinics
2. **HVAC & Field Services** - PE-backed roll-ups, regional service companies
3. **Logistics & Delivery** - Last-mile operators, e-commerce fulfillment
4. **IT Support & MSPs** - Managed service providers, mid-market IT departments
5. **Real Estate & Property** - Multi-family platforms, commercial property management

Each segment includes:
- Buyer personas (titles, seniority, department)
- Pain profiles (what's broken, costs, failed solutions)
- Urgency triggers
- Apollo filters for lead generation
- Messaging guidance (what works, what to avoid)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth

### GTM Data
- `GET /api/gtm/product` - Product context
- `GET /api/gtm/industries` - List all industries
- `GET /api/gtm/industries/:id` - Industry details with segments
- `GET /api/gtm/segments/:id` - Segment details
- `GET /api/gtm/search?q=query` - Search

### Chat
- `POST /api/chat/message` - Send message, get AI response
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history
