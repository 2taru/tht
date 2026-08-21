-- 0018_day_offs.sql — персональні дні-вихідні (свята/відпустка/лікарняний);
-- зменшують планову норму у звітах (блок «Норма за період»).

create table day_offs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  date         date not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id, date)
);
create index on day_offs (workspace_id, user_id, date);

alter table day_offs enable row level security;

-- SELECT — усі члени простору (щоб team-перегляд таймшита бачив чужі позначки).
create policy do_select on day_offs
  for select using (is_member(workspace_id));
-- Пишемо лише власні рядки.
create policy do_insert on day_offs
  for insert with check (user_id = auth.uid() and is_member(workspace_id));
create policy do_update on day_offs
  for update using (user_id = auth.uid() and is_member(workspace_id))
  with check (user_id = auth.uid() and is_member(workspace_id));
create policy do_delete on day_offs
  for delete using (user_id = auth.uid() and is_member(workspace_id));
