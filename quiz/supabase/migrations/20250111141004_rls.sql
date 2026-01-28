-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_events enable row level security;
alter table public.imports enable row level security;

-- profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
on public.profiles
for select
to authenticated
using ((select public.is_admin()));

-- user_roles policies (admin only)
drop policy if exists "roles_admin_all" on public.user_roles;
create policy "roles_admin_all"
on public.user_roles
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- quizzes policies
drop policy if exists "quizzes_select_active" on public.quizzes;
create policy "quizzes_select_active"
on public.quizzes
for select
to authenticated
using (is_active = true or (select public.is_admin()));

drop policy if exists "quizzes_admin_insert" on public.quizzes;
create policy "quizzes_admin_insert"
on public.quizzes
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "quizzes_admin_update" on public.quizzes;
create policy "quizzes_admin_update"
on public.quizzes
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "quizzes_admin_delete" on public.quizzes;
create policy "quizzes_admin_delete"
on public.quizzes
for delete
to authenticated
using ((select public.is_admin()));

-- questions policies
drop policy if exists "questions_select_active_quiz" on public.questions;
create policy "questions_select_active_quiz"
on public.questions
for select
to authenticated
using (
  (select public.is_admin()) OR
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.is_active = true
  )
);

drop policy if exists "questions_admin_insert" on public.questions;
create policy "questions_admin_insert"
on public.questions
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "questions_admin_update" on public.questions;
create policy "questions_admin_update"
on public.questions
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "questions_admin_delete" on public.questions;
create policy "questions_admin_delete"
on public.questions
for delete
to authenticated
using ((select public.is_admin()));

-- attempts policies
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own"
on public.attempts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin"
on public.attempts
for select
to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "attempts_update_own_or_admin" on public.attempts;
create policy "attempts_update_own_or_admin"
on public.attempts
for update
to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()))
with check ((select auth.uid()) = user_id or (select public.is_admin()));

-- attempt_answers policies
drop policy if exists "answers_insert_own" on public.attempt_answers;
create policy "answers_insert_own"
on public.attempt_answers
for insert
to authenticated
with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

drop policy if exists "answers_select_own_or_admin" on public.attempt_answers;
create policy "answers_select_own_or_admin"
on public.attempt_answers
for select
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

drop policy if exists "answers_update_own_or_admin" on public.attempt_answers;
create policy "answers_update_own_or_admin"
on public.attempt_answers
for update
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = (select auth.uid()) or (select public.is_admin()))
  )
)
with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

-- attempt_events policies
drop policy if exists "events_insert_own" on public.attempt_events;
create policy "events_insert_own"
on public.attempt_events
for insert
to authenticated
with check (
  (select auth.uid()) = user_id and
  exists (
    select 1 from public.attempts a
    where a.id = attempt_events.attempt_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists "events_select_own_or_admin" on public.attempt_events;
create policy "events_select_own_or_admin"
on public.attempt_events
for select
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_events.attempt_id
      and (a.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

-- imports policies (admin only)
drop policy if exists "imports_admin_all" on public.imports;
create policy "imports_admin_all"
on public.imports
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
