-- Helper function: is_admin()
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = uid and r.role = 'admin'
  );
$$;

-- Auto-create profile row on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    coalesce(new.email,'')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- Recreate trigger safely
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Assign attempt_no per user+quiz
create or replace function public.assign_attempt_no()
returns trigger
language plpgsql
security definer
as $$
declare
  next_no int;
begin
  select coalesce(max(a.attempt_no), 0) + 1
    into next_no
  from public.attempts a
  where a.user_id = new.user_id and a.quiz_id = new.quiz_id;

  new.attempt_no := next_no;
  return new;
end;
$$;

drop trigger if exists attempts_assign_attempt_no on public.attempts;
create trigger attempts_assign_attempt_no
before insert on public.attempts
for each row execute procedure public.assign_attempt_no();

-- Update updated_at timestamp function
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at();

drop trigger if exists quizzes_updated_at on public.quizzes;
create trigger quizzes_updated_at
before update on public.quizzes
for each row execute procedure public.update_updated_at();

drop trigger if exists imports_updated_at on public.imports;
create trigger imports_updated_at
before update on public.imports
for each row execute procedure public.update_updated_at();
