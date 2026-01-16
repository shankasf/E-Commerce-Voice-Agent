# URackIT V2 - Multi-service Application (Backend, Frontend, AI Service)
FROM node:20-slim

WORKDIR /app

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy AI service requirements and install Python deps
COPY ai-service/requirements.txt ./ai-service/requirements.txt
RUN pip install --no-cache-dir -r ai-service/requirements.txt

# Copy backend package.json and install
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy frontend package.json and install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all source code
COPY . .

# Generate Prisma client with updated schema
RUN cd backend && npx prisma generate

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Expose ports (backend: 3000, frontend: 5173, ai-service: 8000)
EXPOSE 3000 5173 8000

# Production start script
COPY <<EOF /app/start.sh
#!/bin/bash
cd /app/ai-service && uvicorn main:app --host 0.0.0.0 --port 8000 &
cd /app/backend && node dist/src/main.js &
cd /app/frontend && npm run preview -- --host 0.0.0.0 --port 5173
EOF

# Development start script with hot-reload
COPY <<EOF /app/start-dev.sh
#!/bin/bash
echo "Starting URackIT V2 in DEVELOPMENT mode with hot-reload..."

# Start AI service with auto-reload
cd /app/ai-service && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# Start backend with watch mode (NestJS)
cd /app/backend && npm run start:dev &

# Start frontend with Vite dev server
cd /app/frontend && npm run dev -- --host 0.0.0.0 --port 5173

wait
EOF

RUN chmod +x /app/start.sh /app/start-dev.sh

CMD ["/bin/bash", "/app/start.sh"]
