# CallSphere Official Website

This repository contains the marketing website for CallSphere, showcasing the company's AI voice agent platform.

## About CallSphere

CallSphere LLC is an enterprise automation platform that specializes in deploying intelligent agentic systems to automate customer interactions across voice and text channels. The company's mission is to transform inbound communications into completed transactions, resolved support cases, and scheduled services through orchestrated AI agents.

For more detailed information about CallSphere, its products, and its vision, please see the [CallSphere_ About.txt](CallSphere_%20About.txt) file.

## Project Structure

- **frontend/** – Next.js 14 app using the App Router, Tailwind CSS, and custom components for the public-facing site.
  - Includes a realtime voice agent powered by OpenAI's Realtime API
  - React components for all UI sections
  - API routes for contact form, voice agent session management, and analytics
  - Admin dashboard for voice agent analytics and lead tracking

## Prerequisites

- Node.js 18+
- pnpm (recommended)
- MongoDB 6+ (for analytics)

## Getting Started

```bash
cd frontend
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000` to view the site.

## Environment Variables

Create a `.env` file in the `frontend/` directory with:

```
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_VOICE_MODEL=gpt-4o-mini
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/callsphere

# Admin Authentication
ADMIN_EMAIL=admin@callsphere.tech
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-change-in-production

# Email (Resend) - for contact form
RESEND_API_KEY=re_your-resend-api-key
CONTACT_EMAIL=contact@callsphere.tech
```

## Scripts

Inside `frontend/`:

- `pnpm dev` – Start the Next.js development server
- `pnpm build` – Create an optimized production build
- `pnpm start` – Run the production build locally
- `pnpm lint` – Run ESLint checks

## Key Features

- **Voice Agent Banner** – Interactive CTA with realtime state updates (connecting, connected, disconnecting)
- **57+ Language Support** – Animated language ticker showing multilingual capabilities
- **Realtime WebRTC** – Direct voice connection using OpenAI's Realtime API
- **Responsive Design** – Mobile-first Tailwind CSS styling
- **Dark Mode** – Theme toggle with system preference detection

### Voice Agent Analytics Dashboard

Access the admin dashboard at `/admin/login` to view:

- **KPI Cards** – Total sessions, completed, errors, qualified leads, follow-up required, avg duration
- **Sentiment Analysis** – AI-powered sentiment breakdown (positive/neutral/negative)
- **Top Intents & Topics** – Most common visitor intents and discussion topics
- **Session Table** – Filterable list of all voice conversations
- **Session Detail** – Full conversation transcript, extracted PII, lead score, and action items

**Analytics Features:**
- Automatic PII extraction (name, email, phone, company) from conversations
- LLM-powered conversation enrichment (intent, sentiment, lead score, summary)
- Marketing attribution (UTM params, referrer, landing page)
- Session duration and turn count tracking

## Styling & Components

- Tailwind CSS powers global styling (`styles/globals.css`)
- Reusable UI elements live in `components/`
- Animations use `framer-motion` and custom Tailwind keyframes
- Icons from `lucide-react`

## Deployment

The frontend is optimized for static hosting or server-side rendering on platforms like Vercel. Run `pnpm build` followed by `pnpm start` or deploy via your preferred CI/CD workflow.

**MongoDB Setup:**
Ensure MongoDB is running and accessible via the `MONGODB_URI` environment variable before starting the app.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm lint` and `pnpm build`
4. Open a pull request against `main`

## License

Copyright © CallSphere LLC. All rights reserved.
