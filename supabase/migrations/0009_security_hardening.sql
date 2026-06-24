-- 0009_security_hardening.sql — харднінг RLS-функцій

-- 1) is_member: пінимо search_path (SECURITY DEFINER без нього — вектор ескалації;
--    решта функцій уже мають set search_path = public ще з 0005).
create or replace function is_member(ws uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- 2) invite_member: заборона призначати роль owner. Функція SECURITY DEFINER обходить
--    RLS, тож без цієї перевірки admin міг підвищити себе/іншого до owner через
--    on conflict do update, обійшовши захист owner-рядка з 0007.
create or replace function invite_member(
  ws uuid,
  member_email text,
  member_role role default 'member'
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not is_owner_or_admin(ws) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if member_role = 'owner' then
    raise exception 'cannot assign owner role' using errcode = '42501';
  end if;
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws, uid, member_role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;
end;
$$;
