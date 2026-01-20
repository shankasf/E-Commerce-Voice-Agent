#!/bin/bash
# Quick script to update .env.local with new Supabase credentials

echo "📝 Updating .env.local with your Supabase credentials..."
echo ""

read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your anon public key (long JWT token): " ANON_KEY
read -p "Enter your service_role key (long JWT token): " SERVICE_KEY
read -p "Enter your database password: " DB_PASSWORD

# Extract project reference from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo ""
echo "Updating .env.local..."

# Backup existing .env.local
cp .env.local .env.local.backup 2>/dev/null || true

# Update or add credentials
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|" .env.local
else
  echo "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}" >> .env.local
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}|" .env.local
else
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}" >> .env.local
fi

if grep -q "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=.*|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}|" .env.local
else
  echo "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}" >> .env.local
fi

if grep -q "PG_CONNECTION_URI=" .env.local; then
  sed -i '' "s|PG_CONNECTION_URI=.*|PG_CONNECTION_URI=${CONNECTION_STRING}|" .env.local
else
  echo "PG_CONNECTION_URI=${CONNECTION_STRING}" >> .env.local
fi

echo ""
echo "✅ .env.local updated!"
echo ""
echo "Next steps:"
echo "1. Run db/schema.sql in Supabase SQL Editor"
echo "2. Run db/devices_table.sql in Supabase SQL Editor"
echo "3. Run db/device_connections_complete.sql in Supabase SQL Editor"
echo "4. Restart server: npm run dev"
echo "5. Test endpoints!"
