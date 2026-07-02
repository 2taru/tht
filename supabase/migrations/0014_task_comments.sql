-- 0014_task_comments.sql — коментарі до задач (командне обговорення).

-- Композитний FK гарантує, що workspace_id коментаря збігається з workspace задачі
-- (клієнт не може «підкинути» чужий workspace_id повз RLS-політики).
create unique index tasks_id_workspace_uq on tasks (id, workspace_id);

create table task_comments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id      uuid not null,
  user_id      uuid not null references profiles(id) on delete cascade,
  body         text not null check (length(btrim(body)) between 1 and 4000),
  created_at   timestamptz not null default now(),
  foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create index on task_comments (task_id, created_at);

alter table task_comments enable row level security;

-- Читають усі члени простору; пишуть від власного імені; видаляє автор або owner/admin.
create policy tc_select on task_comments
  for select using (is_member(workspace_id));
create policy tc_insert on task_comments
  for insert with check (user_id = auth.uid() and is_member(workspace_id));
create policy tc_delete on task_comments
  for delete using (user_id = auth.uid() or is_owner_or_admin(workspace_id));
-- Редагування коментарів свідомо не даємо (немає update-політики).
