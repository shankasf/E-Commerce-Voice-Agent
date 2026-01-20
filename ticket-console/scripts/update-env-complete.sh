#!/bin/bash
cd "$(dirname "$0")/.."

SUPABASE_URL="https://moowdckeeuvxwjoblrwg.supabase.co"
ANON_KEY="sb_publishable_OnvaDIewM-zhN8p-oArNtw_YbsV3DLF"
SERVICE_KEY="sb_secret_Q4XlBB4Quv58wZs6_Qik2w_g5ccIZxp"
DB_PASSWORD="Rlaehddhks0303!"
PG_CONNECTION_URI="postgresql://postgres:${DB_PASSWORD}@db.moowdckeeuvxwjoblrwg.supabase.co:5432/postgres"

echo "📝 Updating .env.local with all credentials..."

# Backup existing
cp .env.local .env.local.backup 2>/dev/null || true

# Update or create .env.local
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}

# Direct PostgreSQL Connection (for scripts)
PG_CONNECTION_URI=${PG_CONNECTION_URI}
EOF

echo "✅ Updated .env.local!"
echo ""
echo "Database connection string configured."
echo "Next: Run SQL schemas to create tables"
