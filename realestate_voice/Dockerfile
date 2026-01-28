# Real Estate Voice Agent - Python Application
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Create necessary directories
RUN mkdir -p logs db

# Expose port (configurable via PORT env var)
EXPOSE ${PORT:-8089}

# Start the application with reload for development
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8089} --reload"]
