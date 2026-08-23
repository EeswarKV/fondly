-- Chocolatehouse Founder Platform: database schema
-- Run this in the Supabase SQL editor (or `supabase db push` once linked).

-- ─────────────────────────────────────────────
-- 1. Founders (profiles linked to Supabase auth users)
-- ─────────────────────────────────────────────
create table if not exists founders (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  initial text not null,          -- e.g. 'R' for the avatar badge
  color text not null default '#2E6CA4',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. Roadmap: phases and tasks, with verification
-- ─────────────────────────────────────────────
create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  label text not null,            -- e.g. 'Now – Sep 2026'
  sort_order int not null default 0
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  title text not null,
  assignee_id uuid references founders(id),
  status text not null default 'todo'
    check (status in ('todo', 'inprogress', 'review', 'done')),
  verified_by uuid references founders(id),
  created_at timestamptz not null default now()
);

create table if not exists task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references founders(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  raised_by uuid references founders(id),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. Pre-launch investment tracker
-- ─────────────────────────────────────────────
create table if not exists prelaunch_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- e.g. 'Learning & market research'
  budget numeric(12,2) not null default 0
);

create table if not exists prelaunch_expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references prelaunch_categories(id),
  note text not null,
  amount numeric(12,2) not null,
  logged_by uuid references founders(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 4. Monthly operating expenses (post-launch use, but table can exist now)
-- ─────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,         -- 'Ingredients' | 'Packaging' | 'Marketing' | ...
  note text not null,
  amount numeric(12,2) not null,
  logged_by uuid references founders(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 5. Personal notes with reminders (private per founder)
-- ─────────────────────────────────────────────
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references founders(id) on delete cascade,
  text text not null,
  reminder_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 6. Documents (metadata only — actual files go in Supabase Storage)
-- ─────────────────────────────────────────────
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  expires_at date,
  storage_path text,              -- path in a Supabase Storage bucket
  uploaded_by uuid references founders(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 7. Equipment registry
-- ─────────────────────────────────────────────
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost numeric(12,2) not null,
  purchased_at date,
  warranty_expires_at date,
  current_value numeric(12,2)
);

-- ─────────────────────────────────────────────
-- 8. Founder chat
-- ─────────────────────────────────────────────
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references founders(id),
  text text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Row Level Security: only signed-in founders can read/write anything.
-- This is deliberately simple (any founder can touch any row) since it's
-- a 3-4 person team, not a multi-tenant product. Notes are the one
-- exception — private to their owner.
-- ─────────────────────────────────────────────
alter table founders enable row level security;
alter table phases enable row level security;
alter table tasks enable row level security;
alter table task_logs enable row level security;
alter table blockers enable row level security;
alter table prelaunch_categories enable row level security;
alter table prelaunch_expenses enable row level security;
alter table expenses enable row level security;
alter table notes enable row level security;
alter table documents enable row level security;
alter table equipment enable row level security;
alter table chat_messages enable row level security;

-- Generic "any authenticated founder can read/write" policy for shared tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'founders','phases','tasks','task_logs','blockers',
    'prelaunch_categories','prelaunch_expenses','expenses',
    'documents','equipment','chat_messages'
  ]
  loop
    execute format(
      'create policy "founders can read %I" on %I for select using (auth.uid() is not null);',
      t, t
    );
    execute format(
      'create policy "founders can write %I" on %I for insert with check (auth.uid() is not null);',
      t, t
    );
    execute format(
      'create policy "founders can update %I" on %I for update using (auth.uid() is not null);',
      t, t
    );
  end loop;
end $$;

-- Notes: private to the owner only
create policy "owner can read own notes" on notes
  for select using (auth.uid() = owner_id);
create policy "owner can insert own notes" on notes
  for insert with check (auth.uid() = owner_id);
create policy "owner can update own notes" on notes
  for update using (auth.uid() = owner_id);
create policy "owner can delete own notes" on notes
  for delete using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────
-- Seed data: the five roadmap phases from the plan
-- ─────────────────────────────────────────────
insert into phases (label, sort_order) values
  ('Now – Sep 2026', 1),
  ('Oct – Dec 2026', 2),
  ('Dec 2026 – Feb 2027', 3),
  ('Mar – Apr 2027', 4),
  ('May 2027 – Launch', 5)
on conflict do nothing;

insert into prelaunch_categories (name, budget) values
  ('Kitchen equipment', 350000),
  ('Kitchen space & deposit', 175000),
  ('Licensing & legal', 30000),
  ('Brand & design', 90000),
  ('Initial inventory', 50000),
  ('Learning & market research', 40000),
  ('Supplier trials & sourcing', 35000),
  ('Transport & site visits', 25000),
  ('Working capital buffer', 350000)
on conflict do nothing;
