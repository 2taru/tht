-- 0008: крок сітки таймшиту — лишаємо лише 15/30/60 хв (було 5/10/15/30), дефолт 30.

-- 1) Переносимо наявні значення поза новим набором у найближче допустиме.
update user_settings set grid_step_minutes = 15 where grid_step_minutes in (5, 10);

-- 2) Знімаємо старий check (його ім'я авто-згенероване — шукаємо за визначенням).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'user_settings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%grid_step_minutes%'
  loop
    execute format('alter table user_settings drop constraint %I', c);
  end loop;
end $$;

-- 3) Новий дефолт і новий check.
alter table user_settings alter column grid_step_minutes set default 30;
alter table user_settings add constraint user_settings_grid_step_minutes_check
  check (grid_step_minutes in (15, 30, 60));
