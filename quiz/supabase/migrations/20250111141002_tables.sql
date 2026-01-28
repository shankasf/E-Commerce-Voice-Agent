-- profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

-- user_roles (admin/editor)
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  passing_percent int not null default 40,
  time_per_question_sec int not null default 60,
  buffer_sec int not null default 120,
  is_active boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quizzes_active_idx on public.quizzes(is_active);

-- questions
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  qtype public.question_type not null,
  prompt text not null,
  options jsonb not null,
  correct jsonb not null,
  explanation text,
  tags text[],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists questions_quiz_idx on public.questions(quiz_id);
create index if not exists questions_tags_gin on public.questions using gin(tags);

-- attempts
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_no int not null,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_questions int not null,
  time_limit_sec int not null,
  shuffle_seed text not null,
  restart_count int not null default 0,
  restart_reason_last text,
  score_percent numeric(5,2),
  pass boolean,
  device_info jsonb,
  ip inet,
  user_agent text
);

create unique index if not exists attempts_unique_per_user_quiz_attemptno
  on public.attempts(user_id, quiz_id, attempt_no);

create index if not exists attempts_quiz_idx on public.attempts(quiz_id);
create index if not exists attempts_user_idx on public.attempts(user_id);
create index if not exists attempts_status_idx on public.attempts(status);

-- attempt_answers
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected jsonb not null,
  time_spent_ms int,
  changed_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists attempt_answers_attempt_idx on public.attempt_answers(attempt_id);

-- attempt_events (real-time logs)
create table if not exists public.attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists attempt_events_attempt_idx on public.attempt_events(attempt_id);
create index if not exists attempt_events_type_idx on public.attempt_events(event_type);

-- imports (admin uploads CSV/PDF)
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete set null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_type text not null check (file_type in ('csv','pdf')),
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  result_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists imports_status_idx on public.imports(status);
