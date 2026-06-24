-- 0011_role_delete_guard.sql — RLS-бекап UI-гейтингу: видаляти проєкти й задачі
-- можуть лише owner/admin. Решта (читання/створення/редагування) — усім членам.

-- PROJECTS: розбиваємо широку `proj_all` (for all) на по-командні політики.
drop policy proj_all on projects;
create policy proj_select on projects
  for select using (is_member(workspace_id));
create policy proj_insert on projects
  for insert with check (is_member(workspace_id));
create policy proj_update on projects
  for update using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy proj_delete on projects
  for delete using (is_owner_or_admin(workspace_id));

-- TASKS: аналогічно — видалення лише owner/admin.
drop policy task_all on tasks;
create policy task_select on tasks
  for select using (is_member(workspace_id));
create policy task_insert on tasks
  for insert with check (is_member(workspace_id));
create policy task_update on tasks
  for update using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy task_delete on tasks
  for delete using (is_owner_or_admin(workspace_id));
