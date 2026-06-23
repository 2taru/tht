-- 0007_member_guard.sql — захист owner-рядка + привілеї service_role

-- Прибираємо надто широку політику (owner/admin могли робити будь-що, навіть
-- видалити чи понизити власника).
drop policy wm_manage on workspace_members;

-- INSERT: owner/admin додають учасників, але не можуть створити owner-рядок.
create policy wm_insert on workspace_members
  for insert
  with check (is_owner_or_admin(workspace_id) and role <> 'owner');

-- UPDATE: owner/admin змінюють ролі member/admin; не можна чіпати owner-рядок
-- (using role<>'owner') і не можна підвищувати до owner (with check role<>'owner').
create policy wm_update on workspace_members
  for update
  using (is_owner_or_admin(workspace_id) and role <> 'owner')
  with check (is_owner_or_admin(workspace_id) and role <> 'owner');

-- DELETE: owner/admin видаляють учасників, окрім owner-рядка.
create policy wm_delete on workspace_members
  for delete
  using (is_owner_or_admin(workspace_id) and role <> 'owner');

-- Посилення te_update: запис лишається в межах workspace, де користувач є членом
-- (інакше можна було перенести власний запис у чужий workspace).
drop policy te_update on time_entries;
create policy te_update on time_entries
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_member(workspace_id));

-- Привілеї service_role на прикладні таблиці (адмін-тулінг / Edge Functions /
-- бекапи). RLS він обходить (BYPASSRLS), але GRANT на таблиці потрібен.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
