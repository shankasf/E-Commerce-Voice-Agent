# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public folder
COPY public/ ./public/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_PATH=/

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
