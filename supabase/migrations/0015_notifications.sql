-- 0015_notifications.sql — внутрішні сповіщення (перше: «вам призначено задачу»).
-- Пишуться ЛИШЕ тригером (security definer); клієнт може читати/позначати
-- прочитаними/видаляти власні. insert-політики немає — прямий insert заборонено.

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type         text not null check (type in ('task_assigned')),
  task_id      uuid references tasks(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index on notifications (user_id, read_at, created_at desc);

alter table notifications enable row level security;

create policy notif_select on notifications
  for select using (user_id = auth.uid());
create policy notif_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on notifications
  for delete using (user_id = auth.uid());

-- Тригер: призначення виконавця (insert або зміна assignee_id) → сповіщення.
-- Самопризначення не сповіщаємо. auth.uid() у seed/service-контексті = null →
-- is distinct from дає true, сповіщення створиться з actor_id = null (ок).
create or replace function notify_task_assigned() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and new.assignee_id is distinct from auth.uid()
  then
    insert into notifications (user_id, workspace_id, type, task_id, actor_id, payload)
    values (
      new.assignee_id, new.workspace_id, 'task_assigned', new.id, auth.uid(),
      jsonb_build_object('title', new.title)
    );
  end if;
  return new;
end;
$$;

create trigger trg_task_assigned
  after insert or update of assignee_id on tasks
  for each row execute function notify_task_assigned();
