-- seed.sql — тестові дані лише для локальної розробки.
-- Створюємо тестового користувача; тригер handle_new_user() сам зробить
-- profile + user_settings + workspace 'Особистий' + membership owner.

-- Логін для локалі: test@tht.local / password123
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  -- GoTrue сканує ці токен-колонки у Go-стрінги: NULL валить запити схеми, тож ''
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'test@tht.local',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Тест Тестович"}',
  now(), now(),
  '', '', '', '', '', '', '', ''
);

-- identity для email-провайдера (потрібно для входу email+пароль)
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, created_at, updated_at
)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"test@tht.local"}',
  'email', now(), now()
);

-- Наповнюємо особистий workspace тестового користувача.
do $$
declare
  ws uuid;
  p_skyinsure uuid;
  p_skybistro uuid;
  l_bug uuid;
begin
  select id into ws from workspaces
    where owner_id = '11111111-1111-1111-1111-111111111111' limit 1;

  insert into projects (workspace_id, name, color, hourly_rate) values
    (ws, 'SkyInsure', '#2563eb', 600) returning id into p_skyinsure;
  insert into projects (workspace_id, name, color, hourly_rate) values
    (ws, 'SkyBistro', '#16a34a', 450) returning id into p_skybistro;
  insert into projects (workspace_id, name, color, hourly_rate) values
    (ws, 'MS', '#d97706', 500);
  insert into projects (workspace_id, name, color) values
    (ws, 'Other', '#64748b');

  insert into labels (workspace_id, name, color) values
    (ws, 'bug', '#dc2626') returning id into l_bug;
  insert into labels (workspace_id, name, color) values
    (ws, 'feature', '#7c3aed');

  insert into tasks (workspace_id, project_id, title, status, priority, created_by)
    values
    (ws, p_skyinsure, 'Полагодити форму оплати', 'in_progress', 'high',
      '11111111-1111-1111-1111-111111111111'),
    (ws, p_skybistro, 'Меню: фільтр по категоріях', 'todo', 'medium',
      '11111111-1111-1111-1111-111111111111');

  insert into time_entries
    (workspace_id, user_id, project_id, entry_date, start_minute, end_minute, description)
    values
    (ws, '11111111-1111-1111-1111-111111111111', p_skyinsure,
      current_date, 540, 660, 'Розбір багу з оплатою'),
    (ws, '11111111-1111-1111-1111-111111111111', p_skybistro,
      current_date, 660, 750, 'Верстка меню');
end $$;
