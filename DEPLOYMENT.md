# URACKIT Deployment Guide

## 1. Architecture Overview
-   **Server**: Node.js/Express (runs on port 5000). Handles API and Socket.IO.
-   **Client**: React/Vite (builds to static files). Hosted via Nginx/Vercel/Netlify.
-   **Desktop Agent**: Electron (builds to `.exe`). Installed on user machines.
-   **Database**: Supabase (PostgreSQL).

## 2. Environment Variables

### Server (`server/.env`)
```ini
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_strong_secret
OPENAI_API_KEY=your_openai_key
```

### Client (`client/.env`)
```ini
VITE_API_URL=https://your-server-domain.com/api
```

### Desktop Agent (`desktop-agent/.env`)
*Note: The agent allows configuring the server URL in code or via config, ensuring it points to your production server.*

## 3. Deployment Steps

### A. Deploying the Server (e.g., Render/Railway/Heroku)
1.  Push code to GitHub.
2.  Connect repository to hosting provider.
3.  Root Directory: `server`.
4.  Build Command: `npm install`.
5.  Start Command: `node server.js`.
6.  **Important**: Set Environment Variables in the hosting dashboard.

### B. Deploying the Client (e.g., Vercel/Netlify)
1.  Push code to GitHub.
2.  Connect repository.
3.  Root Directory: `client`.
4.  Build Command: `npm run build`.
5.  Output Directory: `dist`.
6.  **Important**: Set `VITE_API_URL` to your production server URL (Step A).

### C. Distributing the Desktop Agent
1.  Navigate to `desktop-agent`.
2.  Run `npm install`.
3.  Run `npm run dist` (requires `electron-builder`).
4.  The installer (`.exe`) will be in `desktop-agent/dist`.
5.  Share this installer with your users.

## 4. Verification
1.  **Login**: Ensure Client can log in via Server.
2.  **Agent**: Install Agent, login, and verify "Online" status in Dashboard.
3.  **Chat**: Send a message in Client; verify AI response.
4.  **Terminal**: Request a command (e.g., "check disk space") from Client; verify Agent prompt.
