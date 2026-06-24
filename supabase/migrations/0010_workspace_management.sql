-- 0010_workspace_management.sql — керування простором: вихід учасника + ренейм адміном

-- Вихід із простору: будь-який учасник може видалити ВЛАСНЕ членство.
-- Owner вийти так не може (його рядок захищений 0007) — він видаляє весь простір.
-- ORиться з wm_delete (owner/admin видаляють інших).
create policy wm_leave on workspace_members
  for delete
  using (user_id = auth.uid() and role <> 'owner');

-- Ренейм простору доступний і admin (не лише owner через ws_modify).
-- Лише UPDATE — видалення простору лишається привілеєм owner (ws_modify FOR ALL).
create policy ws_update on workspaces
  for update
  using (is_owner_or_admin(id))
  with check (is_owner_or_admin(id));
