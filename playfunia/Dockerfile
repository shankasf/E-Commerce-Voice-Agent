# Playfunia - Python + Node.js Application
FROM python:3.11-slim

WORKDIR /app

# Install Node.js and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements first (if exists)
COPY sip_integration/requirements.txt ./sip_integration/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r sip_integration/requirements.txt

# Copy package.json for Node.js dependencies
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy all source code
COPY . .

# Create necessary directories
RUN mkdir -p logs memory db

# Expose port
EXPOSE 8080

# Start the application (Python FastAPI server)
CMD ["uvicorn", "sip_integration.server:app", "--host", "0.0.0.0", "--port", "8080"]
