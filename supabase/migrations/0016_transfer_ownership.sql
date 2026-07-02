-- 0016_transfer_ownership.sql — передача власності простору.
-- Лише поточний owner; новий власник мусить бути членом простору.
-- SECURITY DEFINER обходить RLS-захист owner-рядка з 0007 — саме тому вся
-- перевірка авторизації всередині функції.

create function transfer_ownership(ws uuid, new_owner uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from workspaces where id = ws and owner_id = auth.uid()
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if new_owner = auth.uid() then
    raise exception 'already owner' using errcode = '22023';
  end if;
  if not exists (
    select 1 from workspace_members where workspace_id = ws and user_id = new_owner
  ) then
    raise exception 'not a member' using errcode = 'P0002';
  end if;
  update workspaces set owner_id = new_owner where id = ws;
  update workspace_members set role = 'admin'
    where workspace_id = ws and user_id = auth.uid();
  update workspace_members set role = 'owner'
    where workspace_id = ws and user_id = new_owner;
end;
$$;
