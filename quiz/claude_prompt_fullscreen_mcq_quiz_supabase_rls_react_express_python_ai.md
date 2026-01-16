# PROMPT FOR CLAUDE (COPY/PASTE)

**Meta note:** Use your own knowledge wherever helpful (engineering best practices, security, UX, code quality). This prompt is a strong spec but **not final**—fill gaps, make sensible choices, and document assumptions. If you find a better implementation pattern, use it and explain why.

You are a senior full‑stack engineer. Build a production-ready web app with:
- **React** frontend (User app + Admin portal)
- **Node.js (Express)** backend API
- **Supabase (Postgres + Auth + Storage)** for DB/Auth/files, with **RLS enabled**
- **Python AI service** that uses **OpenAI Agents SDK** to convert uploaded CSV/PDF into quizzes (MCQ single + multi select)

The app is an “exam mode” quiz:
- User must click **Enter Full Screen** to start (Fullscreen API required).
- If user exits fullscreen, switches tabs, tries copy/paste/right‑click/text selection, refreshes, or uses browser back: **restart quiz** and **log the reason**.
- There is **Prev/Next** navigation UI.
- Pressing **Prev** must show a confirmation: “Going back restarts the quiz and reshuffles. Are you sure?”
- If confirmed → restart attempt (new shuffle + new timer) and log.
- **1 minute per question**. Total time = `N * 60 + 120` seconds.
- Passing score: **40%**.
- Login: **Email OTP** + capture **name + email**.
- **All user + admin notifications by email**.
- Must work on all devices (responsive). iOS has limitations; still enforce visibility/tab events + restart when possible.

Deliverables:
1) A monorepo with `apps/web` (React), `apps/admin` (React), `services/api` (Express), `services/ai` (Python FastAPI), and `supabase/migrations`.
2) The full **Supabase SQL schema with RLS policies** (below) as migrations.
3) Backend endpoints and frontend logic implementing all enforcement + real-time event logging.
4) Admin portal with metrics, attempt viewer, question import/export (CSV + PDF).
5) AI service that converts PDF/CSV to validated quiz JSON and writes to DB.
6) README with setup steps.

---

## Reference links (use these to avoid outdated knowledge)

Supabase:
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Passwordless Email OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
- JS signInWithOtp: https://supabase.com/docs/reference/javascript/auth-signinwithotp
- JS verifyOtp: https://supabase.com/docs/reference/javascript/auth-verifyotp
- Storage signed upload URL: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- Upload to signed URL: https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl

OpenAI:
- Agents SDK guide: https://platform.openai.com/docs/guides/agents-sdk
- Models overview (use GPT‑5.2 if available): https://platform.openai.com/docs/models
- List models endpoint: https://platform.openai.com/docs/api-reference/models/list
- Responses API: https://platform.openai.com/docs/api-reference/responses
- Structured outputs (for strict JSON schema): https://platform.openai.com/docs/guides/structured-outputs

---

## Supabase DB schema (CREATE + RLS) — implement as SQL migrations

### 0) Extensions
```sql
create extension if not exists pgcrypto;
```

### 1) Enums
```sql
do $$ begin
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum ('single','multi');
  end if;
  if not exists (select 1 from pg_type where typname = 'attempt_status') then
    create type public.attempt_status as enum ('in_progress','submitted','abandoned');
  end if;
end $$;
```

### 2) Tables

#### profiles (1:1 with auth.users)
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
```

#### user_roles (admin/editor)
```sql
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
```

#### quizzes
```sql
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
```

#### questions
```sql
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  qtype public.question_type not null,
  prompt text not null,
  -- options: ["A...","B...",...]
  options jsonb not null,
  -- correct: [0] for single OR [0,2] for multi
  correct jsonb not null,
  explanation text,
  tags text[],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists questions_quiz_idx on public.questions(quiz_id);
create index if not exists questions_tags_gin on public.questions using gin(tags);
```

#### attempts
```sql
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
```

#### attempt_answers
```sql
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  -- always array of indexes (single => one item)
  selected jsonb not null,
  time_spent_ms int,
  changed_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists attempt_answers_attempt_idx on public.attempt_answers(attempt_id);
```

#### attempt_events (real-time logs)
```sql
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
```

#### imports (admin uploads CSV/PDF)
```sql
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
```

### 3) Helper functions

#### is_admin()
```sql
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
```

#### Auto-create profile row on new auth user
NOTE: Supabase provides examples for this pattern; implement a trigger.
```sql
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

-- recreate trigger safely
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

#### Assign attempt_no per user+quiz
```sql
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
```

### 4) RLS + Policies

Enable RLS:
```sql
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_events enable row level security;
alter table public.imports enable row level security;
```

#### profiles policies
```sql
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

#### user_roles policies (admin only)
```sql
drop policy if exists "roles_admin_all" on public.user_roles;
create policy "roles_admin_all"
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

#### quizzes policies
```sql
-- authenticated users can read active quizzes
drop policy if exists "quizzes_select_active" on public.quizzes;
create policy "quizzes_select_active"
on public.quizzes
for select
to authenticated
using (is_active = true or public.is_admin());

-- admins manage quizzes
drop policy if exists "quizzes_admin_write" on public.quizzes;
create policy "quizzes_admin_write"
on public.quizzes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "quizzes_admin_update" on public.quizzes;
create policy "quizzes_admin_update"
on public.quizzes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "quizzes_admin_delete" on public.quizzes;
create policy "quizzes_admin_delete"
on public.quizzes
for delete
to authenticated
using (public.is_admin());
```

#### questions policies
```sql
drop policy if exists "questions_select_active_quiz" on public.questions;
create policy "questions_select_active_quiz"
on public.questions
for select
to authenticated
using (
  public.is_admin() OR
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id and q.is_active = true
  )
);

-- admins manage questions
drop policy if exists "questions_admin_insert" on public.questions;
create policy "questions_admin_insert"
on public.questions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "questions_admin_update" on public.questions;
create policy "questions_admin_update"
on public.questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "questions_admin_delete" on public.questions;
create policy "questions_admin_delete"
on public.questions
for delete
to authenticated
using (public.is_admin());
```

#### attempts policies
```sql
-- owner can create attempt
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own"
on public.attempts
for insert
to authenticated
with check (auth.uid() = user_id);

-- owner + admin can read
drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin"
on public.attempts
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

-- owner can update their attempt (server validates fields), admin can update
drop policy if exists "attempts_update_own_or_admin" on public.attempts;
create policy "attempts_update_own_or_admin"
on public.attempts
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());
```

#### attempt_answers policies
```sql
drop policy if exists "answers_insert_own" on public.attempt_answers;
create policy "answers_insert_own"
on public.attempt_answers
for insert
to authenticated
with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = auth.uid() or public.is_admin())
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
      and (a.user_id = auth.uid() or public.is_admin())
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
      and (a.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and (a.user_id = auth.uid() or public.is_admin())
  )
);
```

#### attempt_events policies
```sql
drop policy if exists "events_insert_own" on public.attempt_events;
create policy "events_insert_own"
on public.attempt_events
for insert
to authenticated
with check (
  auth.uid() = user_id and
  exists (
    select 1 from public.attempts a
    where a.id = attempt_events.attempt_id and a.user_id = auth.uid()
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
      and (a.user_id = auth.uid() or public.is_admin())
  )
);
```

#### imports policies (admin only)
```sql
drop policy if exists "imports_admin_all" on public.imports;
create policy "imports_admin_all"
on public.imports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

---

## Supabase Storage

Create a private bucket named `quiz-imports`.

Security approach:
- Frontend uses **anon key** + user session.
- Admin portal requests a **signed upload URL** from backend.
- Backend uses **Supabase service role key** to create the signed upload URL.
- Admin uploads file to signed URL from browser.

Paths:
- `quiz-imports/{user_id}/{import_id}/source.pdf`
- `quiz-imports/{user_id}/{import_id}/source.csv`

---

## App behavior requirements (must implement)

### Client-side enforcement (User Quiz)
Implement event listeners:
- Fullscreen: `document.documentElement.requestFullscreen()` on Start click; block start until fullscreen.
- Detect exit: `fullscreenchange` → if not fullscreen → call restart.
- Tab switch: `visibilitychange` (hidden) → restart.
- Window blur: `blur` → restart.
- Clipboard: prevent + log `copy`, `cut`, `paste`.
- Context menu: prevent + log `contextmenu`.
- Text select: log `selectstart` and optionally prevent.
- Browser back: use `history.pushState` + `popstate` to show restart confirm modal.

Restart semantics:
- Mark current attempt as `abandoned`.
- Create a new attempt with new `shuffle_seed` and new time_limit.
- Clear local answers.
- Log event `restart` with payload `{ reason, previous_attempt_id }`.

### Real-time logging
- Frontend batches events and POSTs to API every 1–2 seconds or every 10 events.
- If offline, buffer in localStorage and retry.

Event types to log (minimum):
- `fullscreen_enter`, `fullscreen_exit`, `tab_hidden`, `window_blur`,
- `copy_attempt`, `paste_attempt`, `cut_attempt`, `right_click_attempt`, `select_attempt`,
- `nav_back_attempt`, `nav_back_confirmed_restart`,
- `prev_click`, `prev_confirm_restart`, `next_click`,
- `question_view`, `answer_change`,
- `restart`, `submit`.

### Timer
- time_limit = `(N * 60) + 120` seconds.
- When timer hits 0 → auto-submit.

### Scoring
- Multi-select: require exact match unless otherwise specified.
- pass if score_percent >= 40.

---

## Backend (Express) — implement these endpoints

Auth:
- Use Supabase Auth client on frontend for OTP.
- Backend must verify Supabase JWT on every request.

User quiz API:
- `POST /api/attempts/start` { quizId, deviceInfo } -> returns { attemptId, timeLimitSec, questionOrder:[questionId], shuffleSeed }
- `POST /api/events/batch` { attemptId, events:[{eventType,eventAt,payload}] }
- `POST /api/answers/upsert` { attemptId, questionId, selected:[int], timeSpentMs }
- `POST /api/attempts/restart` { attemptId, reason } -> returns new attempt payload
- `POST /api/attempts/submit` { attemptId } -> calculates score, marks submitted, sends emails

Admin API (admin only):
- `GET /api/admin/metrics?from=...&to=...`
- `GET /api/admin/attempts?...filters...`
- `GET /api/admin/attempts/:id` (attempt + answers + events)
- `POST /api/admin/quizzes` create
- `PUT /api/admin/quizzes/:id`
- `POST /api/admin/quizzes/:id/questions` add
- `POST /api/admin/imports/create` -> creates imports row, returns { importId, signedUploadUrl, token, path }
- `POST /api/admin/imports/:id/process` -> kicks python AI service, stores questions
- `GET /api/admin/quizzes/:id/export.csv`
- `GET /api/admin/quizzes/:id/export.pdf`

Email notifications:
- On OTP: handled by Supabase Auth email templates.
- On submit: backend sends user + admin emails (use SES or another SMTP; store config in env).

---

## Python AI Service (FastAPI)

Endpoints:
- `POST /ai/imports/process` { importId } ->
  1) download file from Supabase Storage using service role,
  2) if PDF: extract text,
  3) if CSV: parse,
  4) call OpenAI Agents SDK to convert to normalized quiz JSON,
  5) validate JSON strictly (Structured Outputs schema),
  6) write questions into Supabase DB (service role),
  7) update imports row with status + summary.

Agent design:
- `ExtractorAgent`: extracts raw text/questions.
- `NormalizerAgent`: converts to canonical JSON structure.
- `ValidatorAgent`: enforces schema + fixes common issues (duplicate options, missing correct answers).
- Use Structured Outputs so the model must conform to the JSON schema.
- Choose model:
  - Prefer `gpt-5.2`.
  - If unavailable, call `/v1/models` and pick the best available GPT‑5.* or fallback.

---

## Frontend apps

### apps/web (User)
Screens:
- Login (name+email, OTP verify)
- Rules + Enter Fullscreen
- Quiz (1 question at a time, Prev/Next, timer)
- Result screen

### apps/admin (Admin)
Screens:
- Admin login (same OTP)
- Dashboard metrics
- Attempts list + filters
- Attempt detail (timeline)
- Quiz manager
- Import: upload CSV/PDF (uses signed upload URL) + “Process”
- Export buttons

UI requirements:
- Responsive (mobile/desktop)
- Don’t implement WCAG now.

---

## Repo structure (generate)

- `apps/web/` (React + Vite)
- `apps/admin/` (React + Vite)
- `services/api/` (Node + Express + TypeScript)
- `services/ai/` (Python + FastAPI)
- `supabase/migrations/` (SQL files)
- `docker-compose.yml` (optional)
- `.env.example`

---

## Environment variables

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Express API:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` (or fetch JWKS)
- `EMAIL_PROVIDER=ses|smtp`
- `SES_REGION`, `SES_ACCESS_KEY`, `SES_SECRET_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS` (comma list)

Python:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

---

## Build instructions

Generate all code files, ready to run locally:
1) Supabase migrations
2) React apps
3) Express API
4) Python service
5) README

IMPORTANT IMPLEMENTATION NOTES:
- Never expose service role key to browser.
- Use anon key + user session on client.
- Express verifies Supabase JWT on every request.
- Enforce RLS at DB level; do not rely only on server checks.
- For shuffle: use deterministic shuffle with seed stored in `attempts.shuffle_seed`.

Now produce:
1) Full monorepo code with file-by-file output (or a clear generation plan + key files in full).
2) The SQL migration file(s) exactly as above.
3) Working minimal UI.
4) Clear instructions to run.

---

## Deployment requirement (must include)

Make it production-live at: **quiz.callsphere.tech**

Provide:
- A `docker-compose.yml` that runs **all services independently**:
  - `web` (React user)
  - `admin` (React admin)
  - `api` (Express)
  - `ai` (FastAPI)
  - (optional) `nginx` reverse proxy
- Use **named volumes** for persistent data where appropriate (e.g., logs, uploads cache). Mount volumes explicitly.
- Provide an **NGINX config** that:
  - routes `/` to user web
  - routes `/admin` to admin web
  - routes `/api/*` to Express
  - routes `/ai/*` to FastAPI
  - enables HTTPS via Let’s Encrypt (certbot) or documented equivalent

Also include a step-by-step deploy doc (`docs/DEPLOYMENT.md`) for a VPS:
- DNS: A record for `quiz.callsphere.tech`
- Nginx + certbot setup (or containerized nginx+certbot)
- Environment variable setup
- `docker compose up -d` commands
- Health checks + troubleshooting

