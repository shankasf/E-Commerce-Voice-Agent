# ===========================================
# Stage 1: Build Web Frontend
# ===========================================
FROM node:20-alpine AS web-builder

WORKDIR /app/web

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ===========================================
# Stage 2: Build Admin Frontend
# ===========================================
FROM node:20-alpine AS admin-builder

WORKDIR /app/admin

COPY apps/admin/package*.json ./
RUN npm ci

COPY apps/admin/ ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ===========================================
# Stage 3: Build API
# ===========================================
FROM node:20-alpine AS api-builder

WORKDIR /app/api

COPY services/api/package*.json ./
RUN npm ci

COPY services/api/ ./
RUN npm run build

# ===========================================
# Stage 4: Final Runtime Image
# ===========================================
FROM debian:bookworm-slim

# Install nginx, Node.js, Python, and supervisord
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY services/ai/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy built web frontend
COPY --from=web-builder /app/web/dist /var/www/web

# Copy built admin frontend
COPY --from=admin-builder /app/admin/dist /var/www/admin

# Copy API
WORKDIR /app/api
COPY services/api/package*.json ./
RUN npm ci --only=production
COPY --from=api-builder /app/api/dist ./dist

# Copy AI service
WORKDIR /app/ai
COPY services/ai/ ./

# Copy nginx config
COPY nginx/quiz-unified.conf /etc/nginx/sites-available/default

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose single port
EXPOSE 80

WORKDIR /app

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
