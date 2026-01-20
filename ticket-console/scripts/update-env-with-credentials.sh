#!/bin/bash
# Update .env.local with new Supabase credentials

cd "$(dirname "$0")/.."

SUPABASE_URL="https://moowdckeeuvxwjoblrwg.supabase.co"
ANON_KEY="sb_publishable_OnvaDIewM-zhN8p-oArNtw_YbsV3DLF"
SERVICE_KEY="sb_secret_Q4XlBB4Quv58wZs6_Qik2w_g5ccIZxp"

echo "📝 Updating .env.local..."
echo "Project URL: $SUPABASE_URL"

# Backup
cp .env.local .env.local.backup 2>/dev/null || true

# Update or add credentials
if [ -f .env.local ]; then
  # Update existing
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|" .env.local 2>/dev/null || \
    echo "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}" >> .env.local
  
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}|" .env.local 2>/dev/null || \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}" >> .env.local
  
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=.*|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}|" .env.local 2>/dev/null || \
    echo "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}" >> .env.local
else
  # Create new
  cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
EOF
fi

echo "✅ Updated .env.local with new credentials!"
echo ""
echo "Still need: Database password for PG_CONNECTION_URI"
echo "Get it from: Settings → Database → Connection string → URI tab"
