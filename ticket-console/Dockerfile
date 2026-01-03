# U Rack IT Ticket Console - Next.js Application
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build Next.js application
RUN npm run build

# Create db and public directories
RUN mkdir -p db public

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
