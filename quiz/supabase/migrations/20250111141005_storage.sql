-- Create storage bucket for quiz imports
-- Note: This needs to be run via Supabase dashboard or API
-- as storage bucket creation is not directly supported via SQL

-- Storage bucket: quiz-imports (private)
-- Paths:
--   quiz-imports/{user_id}/{import_id}/source.pdf
--   quiz-imports/{user_id}/{import_id}/source.csv

-- Storage policies are configured via Supabase dashboard:
-- 1. Allow authenticated users (admins only via API) to upload
-- 2. Allow service role to read/write for AI processing

-- Alternatively, use Supabase Management API:
-- POST /storage/v1/bucket
-- {
--   "id": "quiz-imports",
--   "name": "quiz-imports",
--   "public": false
-- }

-- For reference, storage RLS policies would be:
-- INSERT: Allow admins to upload
-- SELECT: Allow admins and service role to read
-- DELETE: Allow admins to delete
