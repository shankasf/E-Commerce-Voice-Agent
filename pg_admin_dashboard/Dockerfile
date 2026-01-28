FROM node:20-alpine

# Install pg_dump and pg_restore for backup functionality
RUN apk add --no-cache postgresql16-client gzip

WORKDIR /app

# Create non-root user
RUN addgroup -g 10001 appgroup && \
    adduser -u 10001 -G appgroup -D appuser

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Create directories for data
RUN mkdir -p /data/sessions /data/backups && \
    chown -R appuser:appgroup /app /data

ENV NODE_ENV=production
ENV BACKUP_DIR=/data/backups
EXPOSE 3000

USER appuser

CMD ["node", "server.js"]
