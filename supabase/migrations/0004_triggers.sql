-- 0004_triggers.sql
-- Бутстрап користувача: профіль, налаштування, особистий workspace, членство owner.
create or replace function handle_new_user() returns trigger as $$
declare
  ws_id uuid;
begin
  insert into profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into user_settings (user_id) values (new.id);
  insert into workspaces (name, owner_id)
    values ('Особистий', new.id) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
