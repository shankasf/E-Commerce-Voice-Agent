-- Create custom enum types
do $$ begin
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum ('single','multi');
  end if;
  if not exists (select 1 from pg_type where typname = 'attempt_status') then
    create type public.attempt_status as enum ('in_progress','submitted','abandoned');
  end if;
end $$;
