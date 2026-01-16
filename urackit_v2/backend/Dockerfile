FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code (will be overwritten by volume mount in dev)
COPY . .

# Build the application
RUN npm run build

EXPOSE 3003

# Development command (uses ts-node for hot reload)
CMD ["npm", "run", "start:dev"]
