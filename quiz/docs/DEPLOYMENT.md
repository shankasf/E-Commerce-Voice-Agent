# Deployment Guide

This guide explains how to deploy the Quiz application to a VPS at **quiz.callsphere.tech**.

## Prerequisites

- Ubuntu 22.04+ VPS
- Docker and Docker Compose installed
- Domain DNS configured (A record pointing to server IP)
- Supabase project created

## Step 1: DNS Configuration

Create an A record for your domain:
```
Type: A
Name: quiz
Value: <your-server-ip>
TTL: 300
```

Verify DNS propagation:
```bash
dig quiz.callsphere.tech
```

## Step 2: Server Setup

SSH into your server and install Docker:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

## Step 3: Clone and Configure

```bash
# Clone the repository (or upload files)
cd /opt
git clone <repository-url> quiz
cd quiz

# Create environment file
cp .env.example .env
nano .env
```

Fill in the environment variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://quiz.callsphere.tech/api

# Email Configuration
EMAIL_PROVIDER=ses
SES_REGION=us-east-1
SES_ACCESS_KEY=your-access-key
SES_SECRET_KEY=your-secret-key
EMAIL_FROM=noreply@callsphere.tech
ADMIN_EMAILS=admin@callsphere.tech

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
```

## Step 4: Supabase Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration files in order:
   ```
   supabase/migrations/001_extensions.sql
   supabase/migrations/002_enums.sql
   supabase/migrations/003_tables.sql
   supabase/migrations/004_functions.sql
   supabase/migrations/005_rls.sql
   ```

4. Create Storage Bucket:
   - Go to **Storage**
   - Create a new bucket named `quiz-imports`
   - Set it to private

5. Configure Email Templates:
   - Go to **Authentication > Email Templates**
   - Customize the OTP email template:
   ```html
   <h2>Your verification code</h2>
   <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
   <p>This code expires in 1 hour.</p>
   ```

6. Make yourself an admin:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('<your-user-id>', 'admin');
   ```

## Step 5: SSL Certificate (First Time)

Get initial SSL certificate before starting nginx:

```bash
# Create directories
mkdir -p certbot/conf certbot/www

# Get certificate (replace with your email)
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d quiz.callsphere.tech \
  --email admin@callsphere.tech \
  --agree-tos \
  --no-eff-email
```

## Step 6: Build and Deploy

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Step 7: Verify Deployment

1. User App: https://quiz.callsphere.tech
2. Admin Portal: https://quiz.callsphere.tech/admin
3. API Health: https://quiz.callsphere.tech/api/health
4. AI Health: https://quiz.callsphere.tech/ai/health

## Maintenance

### View Logs
```bash
docker-compose logs -f [service-name]
```

### Restart Services
```bash
docker-compose restart [service-name]
```

### Update Deployment
```bash
git pull
docker-compose build
docker-compose up -d
```

### SSL Certificate Renewal
Certificates auto-renew via the certbot container. Manual renewal:
```bash
docker-compose run certbot renew
docker-compose restart nginx
```

### Database Backup
Use Supabase dashboard for database backups, or:
```bash
# If you have direct database access
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

## Troubleshooting

### Check container logs
```bash
docker-compose logs api
docker-compose logs ai
docker-compose logs nginx
```

### Check network connectivity
```bash
docker-compose exec api ping ai
docker-compose exec nginx ping api
```

### Restart everything
```bash
docker-compose down
docker-compose up -d
```

### Common Issues

1. **502 Bad Gateway**: Service not running or health check failing
   - Check service logs
   - Verify environment variables
   - Ensure Supabase credentials are correct

2. **SSL Certificate Issues**:
   - Ensure domain DNS is properly configured
   - Check certbot logs
   - Verify certificate files exist in `certbot/conf/live/`

3. **Database Connection Failed**:
   - Verify Supabase URL and keys
   - Check if Supabase project is active
   - Ensure RLS policies are correctly applied

## Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Supabase RLS enabled
- [ ] Admin access restricted
- [ ] Logs monitored
