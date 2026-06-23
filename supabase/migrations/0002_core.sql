-- 0002_core.sql

-- enums
create type role          as enum ('owner', 'admin', 'member');
create type task_status   as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');

-- profiles (1:1 з auth.users)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table user_settings (
  user_id           uuid primary key references profiles(id) on delete cascade,
  day_start_minute  int  not null default 540,   -- 09:00
  day_end_minute    int  not null default 1140,  -- 19:00
  grid_step_minutes int  not null default 10,
  week_start        int  not null default 1,     -- 1 = понеділок
  theme             text not null default 'system',
  locale            text not null default 'uk',
  check (day_start_minute >= 0 and day_end_minute <= 1440),
  check (day_start_minute < day_end_minute),
  check (grid_step_minutes in (5, 10, 15, 30))
);

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  role         role not null default 'member',
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on workspace_members (user_id);

create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#6366f1',  -- hex
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now()
  -- пост-MVP: hourly_rate numeric, client_id uuid
);
create index on projects (workspace_id, is_archived);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  title        text not null,
  description  text,
  status       task_status   not null default 'todo',
  priority     task_priority not null default 'medium',
  due_date     date,
  position     double precision not null default 0,  -- порядок у колонці
  created_by   uuid not null references profiles(id),
  assignee_id  uuid references profiles(id),          -- пост-MVP (команди)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on tasks (workspace_id, status, position);
create index on tasks (workspace_id, project_id);

create table labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#64748b',
  unique (workspace_id, name)
);

create table task_labels (
  task_id  uuid not null references tasks(id)  on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table time_entries (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  project_id   uuid not null references projects(id),
  task_id      uuid references tasks(id) on delete set null,
  entry_date   date not null,
  start_minute int  not null,
  end_minute   int  not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (start_minute >= 0 and end_minute <= 1440),
  check (start_minute < end_minute),
  -- ЗАБОРОНА ПЕРЕТИНУ: один користувач, один день, інтервали не накладаються
  constraint no_overlap exclude using gist (
    user_id    with =,
    entry_date with =,
    int4range(start_minute, end_minute) with &&
  )
);
create index on time_entries (workspace_id, user_id, entry_date);

-- автооновлення updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_updated   before update on tasks
  for each row execute function set_updated_at();
create trigger trg_entries_updated before update on time_entries
  for each row execute function set_updated_at();
