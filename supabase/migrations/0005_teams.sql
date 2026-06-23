-- 0005_teams.sql — мультикористувацькі workspace (команди)

-- helper: owner або admin workspace
create or replace function is_owner_or_admin(ws uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- helper: чи ділимо спільний workspace (для видимості профілів співучасників)
create or replace function shares_workspace(other uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from workspace_members m1
    join workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid() and m2.user_id = other
  );
$$;

-- автододавання owner-членства при створенні workspace (працює і для UI, і для seed)
create or replace function add_owner_membership() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on workspaces
  for each row execute function add_owner_membership();

-- бутстрап користувача більше не дублює членство — його робить тригер вище.
-- ВАЖЛИВО: search_path=public, бо тригер виконується в контексті GoTrue.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into user_settings (user_id) values (new.id);
  insert into workspaces (name, owner_id) values ('Особистий', new.id);
  return new;
end;
$$;

-- профілі: видимі співучасникам спільних workspace (на додачу до own_profile)
create policy profiles_shared on profiles
  for select using (shares_workspace(id));

-- workspace_members: керують owner/admin (запис/зміна ролі/видалення)
create policy wm_manage on workspace_members
  for all
  using (is_owner_or_admin(workspace_id))
  with check (is_owner_or_admin(workspace_id));

-- time_entries: усі члени workspace БАЧАТЬ записи; писати — лише власник
drop policy te_own on time_entries;
create policy te_select on time_entries
  for select using (is_member(workspace_id));
create policy te_insert on time_entries
  for insert with check (user_id = auth.uid() and is_member(workspace_id));
create policy te_update on time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy te_delete on time_entries
  for delete using (user_id = auth.uid());

-- запросити користувача (за email наявного акаунта) у workspace
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
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws, uid, member_role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;
end;
$$;
