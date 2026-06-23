-- 0003_rls.sql

-- helper: чи є поточний користувач членом workspace
create or replace function is_member(ws uuid) returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- увімкнути RLS
alter table profiles          enable row level security;
alter table user_settings     enable row level security;
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table projects          enable row level security;
alter table tasks             enable row level security;
alter table labels            enable row level security;
alter table task_labels       enable row level security;
alter table time_entries      enable row level security;

-- profiles / user_settings — лише власник
create policy own_profile on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_settings on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workspaces — членам на читання; власнику на зміну
create policy ws_select on workspaces
  for select using (is_member(id));
create policy ws_modify on workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- workspace_members — членам видно склад; керує owner/admin (деталі — пост-MVP)
create policy wm_select on workspace_members
  for select using (is_member(workspace_id));

-- projects / tasks / labels — членам workspace
create policy proj_all on projects
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy task_all on tasks
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy label_all on labels
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy task_labels_all on task_labels
  for all using (exists (
    select 1 from tasks t
    where t.id = task_labels.task_id and is_member(t.workspace_id)
  ));

-- time_entries — соло: лише власні записи (для команд пізніше розширимо)
create policy te_own on time_entries
  for all
  using (user_id = auth.uid() and is_member(workspace_id))
  with check (user_id = auth.uid() and is_member(workspace_id));

-- Привілеї на таблиці для авторизованих (RLS усе одно обмежує рядки).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
