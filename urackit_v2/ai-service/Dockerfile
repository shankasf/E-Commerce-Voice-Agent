FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (will be overwritten by volume mount in dev)
COPY . .

EXPOSE 8081

# Run with uvicorn and hot reload for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081", "--reload"]
