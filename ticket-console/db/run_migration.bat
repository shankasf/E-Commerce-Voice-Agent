@echo off
REM Install Supabase CLI (run once)
REM npm install -g supabase

REM Run the migration
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" --file device_chat_schema.sql

echo Migration completed!
pause
