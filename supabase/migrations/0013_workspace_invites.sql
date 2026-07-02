-- 0013_workspace_invites.sql — запрошення незареєстрованих користувачів.
-- invite_member: якщо акаунта з email немає — зберігаємо pending-запрошення;
-- handle_new_user при реєстрації підхоплює їх і додає членства автоматично.

create table workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null check (email = lower(email) and position('@' in email) > 1),
  role         role not null default 'member' check (role <> 'owner'),
  invited_by   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);
create index on workspace_invites (email);

alter table workspace_invites enable row level security;

-- Бачать і керують owner/admin простору (запрошений ще не має акаунта).
create policy wi_select on workspace_invites
  for select using (is_owner_or_admin(workspace_id));
create policy wi_insert on workspace_invites
  for insert with check (is_owner_or_admin(workspace_id) and role <> 'owner');
create policy wi_delete on workspace_invites
  for delete using (is_owner_or_admin(workspace_id));

-- invite_member тепер повертає 'added' (акаунт існує — додано одразу) або
-- 'invited' (збережено pending-запрошення). Зміна типу повернення → drop+create.
drop function if exists invite_member(uuid, text, role);

create function invite_member(
  ws uuid,
  member_email text,
  member_role role default 'member'
) returns text
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
    insert into workspace_invites (workspace_id, email, role, invited_by)
      values (ws, lower(member_email), member_role, auth.uid())
      on conflict (workspace_id, email) do update set role = excluded.role;
    return 'invited';
  end if;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws, uid, member_role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;
  -- якщо на цей email лишалось pending-запрошення в цей простір — прибираємо
  delete from workspace_invites
    where workspace_id = ws and email = lower(member_email);
  return 'added';
end;
$$;

-- Бутстрап користувача: + авто-приєднання за pending-запрошеннями.
-- ВАЖЛИВО: search_path=public, бо тригер виконується в контексті GoTrue.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into user_settings (user_id) values (new.id);
  insert into workspaces (name, owner_id) values ('Особистий', new.id);
  insert into workspace_members (workspace_id, user_id, role)
    select wi.workspace_id, new.id, wi.role
    from workspace_invites wi
    where wi.email = lower(new.email)
    on conflict (workspace_id, user_id) do nothing;
  delete from workspace_invites where email = lower(new.email);
  return new;
end;
$$;
