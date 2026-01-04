# CallSphere LLC Website

Production-ready marketing site for CallSphere LLC powered by Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, and d3-driven background effects. The site showcases AI voice agents, captures demo requests, and ships with a floating voice-orb launcher snippet for embedding on any page.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Feature Highlights](#feature-highlights)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Styling, Theming & Animation System](#styling-theming--animation-system)
- [Application Walkthrough](#application-walkthrough)
- [Voice Agent Launcher Snippet](#voice-agent-launcher-snippet)
- [SEO, Analytics & Assets](#seo-analytics--assets)
- [Deployment](#deployment)
- [Quality Checks](#quality-checks)
- [Accessibility & Performance Notes](#accessibility--performance-notes)

## Overview
The marketing site leans on the App Router and server components for fast-first paints while client components power interactive sections (hero conversation carousel, sticky nav, pricing toggles, contact form). Global layout layers in a d3-powered wave background, a noise overlay, and dark-by-default theming. Content blocks are modularized under `components/` so sections can be reordered or reused across future routes without touching page logic.

## Tech Stack
- **Framework:** Next.js 14 App Router (React 18, TypeScript, Server Components)
- **Styling:** Tailwind CSS 3.4, CSS variables defined in `styles/globals.css`, tailwindcss-animate, custom glassmorphism utilities
- **State & Forms:** React hooks + Zod validation, fetch-based form submission to Next API routes
- **Animation:** Framer Motion for hero/UI motion, d3 for interactive background waves, CSS keyframes for decorative pulses
- **Icons & UI:** Lucide React, Radix Slot utilities, class-variance-authority driven `<Button />`
- **Theming:** next-themes toggle persisted via `callsphere-theme`
- **Email Delivery:** Resend SDK with graceful fallback logging
- **Tooling:** ESLint (Next config), TypeScript strict mode, next-sitemap for XML generation, pnpm for package management

## Feature Highlights
- Sticky top navigation with IntersectionObserver-based section highlighting, smooth hash scrolling, drawer fallback on mobile, and integrated theme toggle.
- Hero module simulates a live AI-agent conversation, progress tracking, assistant avatars, and CTA cluster - all animated via Framer Motion.
- Marketing sections for Features, How It Works, Industries, Integrations, Stats, CTA band, Pricing (monthly vs annual toggle), Testimonials, and FAQ; each lives in its own component for reuse.
- Contact funnel composed of `ContactSection` + `ContactForm`, featuring inline validation, honeypot spam trap, optimistic UI states, and server-side handoff to `/api/contact`.
- d3-powered `InteractiveWave` background plus configurable noise overlay to deliver the neon aesthetic without heavy media files.
- Fully-configured metadata (OpenGraph + Twitter cards), sitemap, robots, and placeholder analytics script.
- Self-contained floating Voice Agent Launcher orb (`voice-orb/`) plus an in-app React implementation that taps OpenAI for live, speech-enabled conversations.

## Project Structure
```
frontend/
|- app/
|  |- api/contact/route.ts      # Resend-backed contact endpoint
|  |- api/voice-agent/route.ts  # OpenAI proxy powering the floating launcher
|  |- layout.tsx                # Metadata, ThemeProvider, InteractiveWave, analytics placeholder
|  |- page.tsx                  # Home page composition
|  |- favicon.ico, robots.txt, sitemap.xml, opengraph-image.png
|- components/
|  |- CTA, Hero, Nav, Footer, section components, cards, LogoCloud, ThemeToggle, etc.
|  |- ContactForm.tsx           # Client form w/ zod validation + honeypot
|  |- InteractiveWave.tsx       # d3 animated gradient wave canvas
|  |- VoiceAgentLauncher.*      # React orb + voice controls
|  \- providers/ThemeProvider.tsx
|- lib/utils.ts                 # `cn`, `currentYear`, smooth scroll helper
|- public/                      # Logo asset + generated sitemap files
|- styles/globals.css           # Tailwind base import, CSS vars, utility classes
|- tailwind.config.ts           # Extended theme tokens + animations
|- next.config.mjs              # Image + domain settings
|- next-sitemap.config.js       # Sitemap defaults
|- voice-orb/                   # Floating voice assistant launcher snippet (HTML/CSS/JS)
|- package.json / pnpm-lock.yaml
\- README.md (this file)
```

## Getting Started
### Prerequisites
- Node.js **18.18+** (Next.js 14 requirement)
- pnpm **8+** installed globally (`corepack enable` recommended)

### Install Dependencies
```bash
pnpm install
```

### Run the Dev Server
```bash
pnpm dev
```
Visit http://localhost:3000 to preview the site with hot reloading.

### Production Build & Preview
```bash
pnpm build    # Runs next build then next-sitemap
pnpm start    # Serves the production build on port 3000
```

### Static Export (optional)
```bash
pnpm export   # Emits a static version to ./out (requires fully static routes)
```

## Available Scripts
| Script        | Description                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`    | Runs `next dev` with React Fast Refresh and typed lint overlays.                             |
| `pnpm build`  | Executes `next build` (type checks + bundling) and then `next-sitemap` using `SITE_URL`.     |
| `pnpm start`  | Launches `next start` to serve the `.next` production build.                                 |
| `pnpm lint`   | Checks the project with ESLint/Next defaults.                                                |
| `pnpm export` | Optionally outputs a static `out/` directory (used only if you need a static artifact).      |

## Environment Variables
| Variable            | Required | Default                                     | Purpose                                                                 |
| ------------------- | -------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `SITE_URL`          | No       | `https://callsphere.tech`                   | Canonical base URL consumed by `next-sitemap`.                          |
| `RESEND_API_KEY`    | No       | _undefined_                                 | Enables transactional email delivery via Resend in `/api/contact`.      |
| `RESEND_FROM_EMAIL` | No       | `CallSphere LLC <sagar@callsphere.tech>`    | Customizes the "from" identity for demo request emails.                 |
| `CONTACT_RECIPIENT` | No       | `sagar@callsphere.tech`                     | Target inbox for contact form submissions.                              |
| `OPENAI_API_KEY`    | Yes*     | _undefined_                                 | Required for the live voice agent (`/api/voice-agent`).                 |
| `OPENAI_VOICE_MODEL`| No       | `gpt-4o-transcribe`                         | Override the OpenAI model used for the voice agent.                     |
| `OPENAI_REALTIME_MODEL` | No   | `gpt-4o-realtime-preview`                   | Model used for the realtime microphone session powering the in-app orb. |

Behavior without Resend secrets: the API logs submissions server-side (so UX still shows success) but no email is sent. Provide the three variables above in production to deliver real messages.

Voice agent requirement: set `OPENAI_API_KEY` (and optionally `OPENAI_VOICE_MODEL`) so the floating launcher can call OpenAI. Without it, the backend returns a 503 and the UI surfaces an error.

## Styling, Theming & Animation System
- **Design tokens:** `styles/globals.css` defines background/foreground/accent hues, glass card helpers, and reusable gradients. Tailwind pulls those via CSS variables so dark/light themes stay in sync.
- **Tailwind extensions:** `tailwind.config.ts` registers the Inter font, grid-glow background, float + pulse animations, and a `glow` shadow used on CTA buttons.
- **Theme control:** `ThemeProvider` (next-themes) stores the active theme in `localStorage` (`callsphere-theme`). `<ThemeToggle />` swaps icons and respects hydration by rendering a placeholder until mounted.
- **Interactive background:** `InteractiveWave.tsx` renders a responsive d3 SVG wave with gradient glow + blur filters. It listens for pointer movement, uses `ResizeObserver`, and automatically tears down listeners.
- **Framer Motion usage:** Hero copy, conversation cards, and supporting stats fade/slide in with eased transitions. `AnimatePresence` powers the message carousel.
- **Utility helpers:** `.glass-card`, `.noise-overlay`, and `.radial-divider` classes in CSS create consistent translucent containers and separators across sections.
- **Reduced motion:** Keyframe-heavy components (including the standalone voice orb) respect `prefers-reduced-motion` to disable large, continuous motion for sensitive users.

## Application Walkthrough
### Layout & Global Providers
- `app/layout.tsx` sets metadata (OpenGraph, Twitter, canonical URL), loads the Inter font, renders the skip link for keyboard users, mounts the theme provider, and injects a placeholder analytics script (`id="google-analytics-placeholder"`). Update that script block with your GA/GTM snippet when ready.
- The `InteractiveWave` + `.noise-overlay` combo supplies the ambient gradient background on every page.

### Navigation & Hero
- `components/Nav.tsx` keeps track of the active section via `IntersectionObserver`, smooth-scrolls with `scrollToHash` from `lib/utils.ts`, and falls back to a drawer on mobile. Buttons reuse the shared `<Button />` component powered by class-variance-authority.
- `components/Hero.tsx` rotates through a scripted conversation (`conversationScript` array) and animates each entry with `AnimatePresence`. Progress is mapped to a gradient bar while CTA buttons invite booking a demo or viewing pricing.

### Marketing Sections
- Section components such as `FeaturesSection`, `HowItWorksSection`, `IndustriesSection`, `IntegrationsSection`, `StatsSection`, `TestimonialsSection`, `FAQSection`, `PricingSection`, and `CTA` live in `components/`. Each receives static data arrays within the file for now; you can extract them to JSON/content APIs later without adjusting layout markup.
- `PricingSection` includes monthly/annual toggle logic, highlighting the recommended plan with glowing accents.

### Contact Funnel & API
- `ContactSection` renders the form alongside sales contact details. `ContactForm.tsx` runs client-side Zod validation, enforces a honeypot field (`website`), and shows inline success/error banners.
- Server route `app/api/contact/route.ts` re-validates payloads, optionally sends an email through Resend, and logs to the console when secrets are absent. Errors return 400/502 codes that the client surfaces to the user.

### Voice Agent Backend + Launcher
- `components/VoiceAgentLauncher.tsx` renders the floating pill/orb, toggles the 3D orb animation, listens for speech via the Web Speech API, falls back to text input, and speaks answers using `speechSynthesis`.
- Every utterance posts to `/api/voice-agent`, which wraps OpenAI's Responses API (`gpt-4o-transcribe` by default) with a CallSphere-specific system prompt. The route lives at `app/api/voice-agent/route.ts` and returns concise assistant replies plus usage metadata.
- Responses are read aloud automatically and logged in the panel UI. Mini status badges show whether the mic is listening or the model is thinking.

## Voice Agent Launcher
There are two packaging options for the Giga.ai-inspired orb:

1. **React component (default in the app)** — `components/VoiceAgentLauncher.tsx` + `.module.css` renders the floating pill/orb, runs Web Speech API capture, uses speech synthesis for replies, and calls the backend OpenAI proxy at `/api/voice-agent`. It is already mounted inside `app/page.tsx`, so adding `OPENAI_API_KEY` is all you need to enable it locally or in production.
2. **Standalone snippet (`voice-orb/`)** — Plain HTML/CSS/JS version for embedding outside Next.js. Follow the steps below to copy it into any site.

**Standalone usage**
1. Copy `voice-orb/index.html`, `voice-orb/styles.css`, and `voice-orb/script.js` into your host or CMS.
2. Include the stylesheet + script:
   ```html
   <link rel="stylesheet" href="/voice-orb/styles.css">
   <script defer src="/voice-orb/script.js"></script>
   ```
3. Drop the launcher markup near the end of `<body>` so it layers above any existing chatbot widget.
4. Override CSS custom properties (`--orb-size`, `bottom`, `right`) if you need to adjust spacing. Extend the JS toggle callbacks to start audio capture or analytics if desired.

Both versions respect `prefers-reduced-motion`, close on outside click/`Esc`, and keep the orb pinned just above the existing chatbot icon space.

## SEO, Analytics & Assets
- **Metadata:** All primary tags live inside `app/layout.tsx` (`metadataBase`, OpenGraph, Twitter, keywords, alternates). Update once your production domain changes.
- **Sitemaps & robots:** `next-sitemap` emits `public/sitemap-0.xml` and `public/sitemap.xml` after every `pnpm build`. `app/robots.txt` and `app/sitemap.xml` serve lightweight defaults at runtime.
- **OpenGraph image:** `app/opengraph-image.png` (1200x630) is referenced by both OG and Twitter metadata - replace with branded artwork when desired.
- **Public assets:** `public/callsphere-logo.png` feeds `<Image />` components; additional partner logos can live here as needed.
- **Analytics placeholder:** Replace the script block with your GA4/GTM snippet. Because it uses `next/script`, the snippet loads after hydration while preserving ordering.

## Deployment
1. **Set environment variables** in your deployment platform (Vercel recommended): `SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_RECIPIENT`.
2. **Build command:** `pnpm install --frozen-lockfile && pnpm build`. This runs both the Next build and sitemap generation.
3. **Output directory:** `.next` served via `pnpm start` (Vercel handles this automatically). Use `pnpm export` only if deploying to a static host and you do not rely on API routes.
4. **Image optimization:** The default `next/image` loader works best on Vercel. If you deploy elsewhere, ensure the platform supports Next image optimization or update `next.config.mjs`.
5. **Post-deploy checks:** Hit `/robots.txt`, `/sitemap.xml`, and the contact form to ensure secrets are wired and Resend accepts traffic from your domain.

## Quality Checks
- `pnpm lint` - run before each commit to catch JSX/TypeScript issues.
- `pnpm build` - ensures type checking passes and production assets compile.
- Optional: `tsc --noEmit` if you want pure type-check runs (already covered by `next build`).
- Manual QA: verify the contact form with valid + invalid payloads (and toggled network throttling) to ensure error banners show properly.

## Accessibility & Performance Notes
- Skip link (`href="#main"`) becomes visible when focused to help keyboard users.
- Buttons and toggles include discernible text and `aria` attributes where necessary (nav toggle, voice orb, theme switch).
- Animations respect `prefers-reduced-motion`. If you add motion-heavy components, wrap them in the same media query guard.
- IntersectionObserver thresholds keep the sticky nav in sync without excessive reflows.
- The site avoids blocking fonts by using `display: "swap"` on Inter, minimizing CLS.

With these details you can confidently extend, deploy, or embed the CallSphere marketing experience, and reuse the floating Voice Agent Launcher wherever your brand needs a futuristic voice entry point.
