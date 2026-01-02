# Development Dockerfile for Next.js with hot-reload
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Expose port 3000
EXPOSE 3000

# Start development server with hot-reload
CMD ["pnpm", "dev"]
