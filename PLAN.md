# tht — Track Hours & Tasks

> Персональний трекер часу + менеджер задач під реальний воркфлоу, з прицілом
> вирости в командний інструмент (легкий спеціалізований клон Trello + таймшит).
>
> **Назва:** `tht` (Track Hours & Tasks).
> **Статус:** планування завершено, готові до Phase 0.
> **Останнє оновлення плану:** 2026-06-23.

---

## Зміст

1. [Контекст і мета](#1-контекст-і-мета)
2. [Зафіксовані рішення](#2-зафіксовані-рішення)
3. [Технологічний стек](#3-технологічний-стек)
4. [Архітектура](#4-архітектура)
5. [Схема бази даних](#5-схема-бази-даних)
6. [SQL-міграції (готові)](#6-sql-міграції-готові)
7. [RLS-політики](#7-rls-політики)
8. [Авторизація і бутстрап користувача](#8-авторизація-і-бутстрап-користувача)
9. [Доступ до даних (react-query)](#9-доступ-до-даних-react-query)
10. [Функціонал і UX-специфікації](#10-функціонал-і-ux-специфікації)
11. [Роутинг](#11-роутинг)
12. [Дизайн / UI](#12-дизайн--ui)
13. [Структура проєкту](#13-структура-проєкту)
14. [Конвенції коду](#14-конвенції-коду)
15. [Dev-воркфлоу і середовища](#15-dev-воркфлоу-і-середовища)
16. [Деплой](#16-деплой)
17. [Edge-кейси і правила](#17-edge-кейси-і-правила)
18. [Дорожня карта](#18-дорожня-карта)
19. [Відкриті питання](#19-відкриті-питання)

---

## 1. Контекст і мета

Зараз облік ведеться у двох Excel-листах:

1. **Лист часу** — рядки = дні місяця, колонки = слоти по 30 хв (9:00–19:00).
   Кожна клітинка зафарбована кольором проєкту + короткий опис що робив.
   Є денні/тижневі/місячні підсумки годин (десяткові: 6.5, 4.5).
2. **Лист TODO** — нумеровані задачі з описом, тегом проєкту (skyinsure / skybistro /
   ms / other — кольорами) і пріоритетом (число).

**Мета:** замінити це веб-додатком, доступним з будь-якого пристрою, з логіном.
Спочатку — особистий інструмент (соло). У майбутньому — команди: спільні проєкти,
ролі, призначення задач, спільний облік годин.

**Принципи проєктування:**

- Соло-MVP, але БД і RLS одразу проєктуються multi-tenant (`workspace_id` всюди),
  щоб додати команди без міграції-перебудови.
- Облік часу — ядро продукту; усе інше обслуговує його.
- Десктоп-first; мобільну адаптацію виносимо в пост-MVP.

---

## 2. Зафіксовані рішення

| Питання                       | Рішення                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Фронтенд**                  | Vite + React + TypeScript + shadcn/ui + Tailwind                                                     |
| **Бекенд / БД**               | Supabase (PostgreSQL + Auth + Realtime + RLS)                                                        |
| **Менеджер пакетів**          | pnpm                                                                                                 |
| **Деплой**                    | Фронт = статика на власний VPS (nginx); бек = Supabase хмара                                         |
| **Обсяг MVP**                 | Соло, але БД одразу з `workspace_id` під майбутні команди                                            |
| **Облік часу**                | Інтервальна сітка, крок **10 хв**; протягування = **один цілісний запис**; клік → деталі/редагування |
| **Вигляд таймшиту**           | Перемикач **Тиждень ⇄ День**                                                                         |
| **Межі часу**                 | Налаштовувані (за замовч. 9:00–19:00), без переходу через північ                                     |
| **Формат годин**              | **Десяткові** (6.5 г)                                                                                |
| **Задачі — вигляд**           | І Kanban-дошка, і список (перемикач тих самих задач)                                                 |
| **Kanban-колонки**            | Фіксовані 3: To-do / In progress / Done                                                              |
| **Поля задачі**               | Назва, опис, проєкт, пріоритет (low/medium/high), статус, дедлайн, теги                              |
| **Час ↔ задачі**              | Опціональний зв'язок                                                                                 |
| **Проєкти**                   | Плаский список: назва + колір + архівування                                                          |
| **Звіти**                     | Підсумки по дню/тижню/місяцю і по проєктах + експорт CSV                                             |
| **Авторизація**               | Email+пароль + Google OAuth                                                                          |
| **Мова**                      | Українська, i18n-ready                                                                               |
| **Тема**                      | Світла + темна                                                                                       |
| **Гроші/білінг**              | Не в MVP; схема розширювана                                                                          |
| **Міграція з Excel**          | Ні, з чистого аркуша                                                                                 |
| **Перетин записів**           | **Заборонено** (DB exclusion constraint + перевірка в UI)                                            |
| **Швидкі дії (копія/повтор)** | Пост-MVP, не в MVP                                                                                   |
| **Dev Supabase**              | Локальний через Supabase CLI (Docker) + окремий prod-проєкт                                          |
| **Мобільний**                 | Пост-MVP                                                                                             |

---

## 3. Технологічний стек

**Ядро**

- `vite`, `react`, `react-dom`, `typescript`
- `tailwindcss`, `shadcn/ui` (Radix), `lucide-react`
- `@supabase/supabase-js`

**Дані / стан**

- `@tanstack/react-query` — кеш, запити, мутації, оптимістичні апдейти
- `zod` — валідація
- `react-hook-form` + `@hookform/resolvers`

**Навігація / UX**

- `react-router-dom`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` — drag&drop (Kanban + сітка)
- `date-fns` — дати/час (локаль `uk`)
- `next-themes` — світла/темна тема
- `react-i18next`, `i18next`, `i18next-browser-languagedetector`

**Звіти**

- `recharts` — графіки
- Експорт CSV — власна утиліта (Blob); Excel (`xlsx`) — пост-MVP

**Інструменти**

- `eslint`, `prettier`, `vitest` + `@testing-library/react` (юніти утиліт/хуків)
- `supabase` CLI — локальна БД, міграції, генерація типів

---

## 4. Архітектура

```
┌────────────────────────────┐         ┌──────────────────────────────┐
│   Браузер (десктоп)         │         │          Supabase            │
│                            │  HTTPS  │  ┌────────────────────────┐  │
│  Vite + React SPA          │ ──────► │  │ Auth (email + Google)  │  │
│  - react-query (кеш)       │         │  ├────────────────────────┤  │
│  - supabase-js (PostgREST) │ ◄────── │  │ PostgreSQL + RLS       │  │
│  - zod / react-hook-form   │ realtime│  ├────────────────────────┤  │
└────────────┬───────────────┘ (post)  │  │ Realtime (пост-MVP)    │  │
             │ build → dist/           │  └────────────────────────┘  │
             ▼                         └──────────────────────────────┘
   ┌──────────────────┐
   │ nginx на VPS     │  ← роздає dist/, SPA fallback на index.html
   └──────────────────┘
```

- Власного Node-сервера й PM2 **немає**. React звертається до Supabase напряму
  (PostgREST через `supabase-js`), захист — RLS у Postgres.
- Складна серверна логіка за потреби → Supabase **Edge Functions** (Deno).
- Realtime-підписки вмикаємо лише на пост-MVP етапі команд.

---

## 5. Схема бази даних

> Усі прикладні таблиці мають `workspace_id`. Час зберігаємо як **хвилини від
> півночі (int)** — тривіальна математика сітки з кроком 10 хв і жодних таймзон.
> `entry_date` — локальна дата без TZ. Тривалість = `end_minute − start_minute`,
> у годинах = `/ 60` (десяткові). Усі PK — `uuid` (`gen_random_uuid()`).

### Таблиці (огляд)

| Таблиця             | Призначення                   | Ключові поля                                                                                  |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| `profiles`          | Профіль (1:1 з auth.users)    | id, display_name, avatar_url                                                                  |
| `user_settings`     | Особисті налаштування         | day_start_minute, day_end_minute, grid_step_minutes, theme, locale, week_start                |
| `workspaces`        | Простір (особистий / команда) | id, name, owner_id                                                                            |
| `workspace_members` | Членство + ролі               | workspace_id, user_id, role                                                                   |
| `projects`          | Проєкти                       | workspace_id, name, color, is_archived                                                        |
| `tasks`             | Задачі                        | workspace_id, project_id, title, status, priority, due_date, position                         |
| `labels`            | Теги (workspace-scoped)       | workspace_id, name, color                                                                     |
| `task_labels`       | Зв'язок задача↔тег            | task_id, label_id                                                                             |
| `time_entries`      | Записи часу (ядро)            | workspace_id, user_id, project_id, task_id, entry_date, start_minute, end_minute, description |

### Зв'язки (ER, спрощено)

```
auth.users 1───1 profiles 1───* workspace_members *───1 workspaces
                     │                                      │
                     │ owner_id ─────────────────────────────┘
workspaces 1───* projects 1───* tasks *───* labels  (через task_labels)
workspaces 1───* time_entries *───1 projects
tasks 0..1 ───* time_entries          (опціональний task_id)
profiles 1───* time_entries (user_id)
```

### Enum-и (як CHECK або Postgres enum)

- `role`: `owner | admin | member`
- `task_status`: `todo | in_progress | done`
- `task_priority`: `low | medium | high`

---

## 6. SQL-міграції (готові)

> Папка `supabase/migrations/`. Нижче — повний DDL для MVP. Розбити на файли
> `0001_extensions.sql`, `0002_core.sql`, `0003_rls.sql`, `0004_triggers.sql`
> (RLS і тригери — у розділах 7–8).

```sql
-- 0001_extensions.sql
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- EXCLUDE для заборони перетину

-- 0002_core.sql

-- enums
create type role          as enum ('owner','admin','member');
create type task_status   as enum ('todo','in_progress','done');
create type task_priority as enum ('low','medium','high');

-- profiles (1:1 з auth.users)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table user_settings (
  user_id           uuid primary key references profiles(id) on delete cascade,
  day_start_minute  int  not null default 540,   -- 09:00
  day_end_minute    int  not null default 1140,  -- 19:00
  grid_step_minutes int  not null default 10,
  week_start        int  not null default 1,      -- 1 = понеділок
  theme             text not null default 'system',
  locale            text not null default 'uk',
  check (day_start_minute >= 0 and day_end_minute <= 1440),
  check (day_start_minute < day_end_minute),
  check (grid_step_minutes in (5,10,15,30))
);

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  role         role not null default 'member',
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on workspace_members (user_id);

create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#6366f1',  -- hex
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now()
  -- пост-MVP: hourly_rate numeric, client_id uuid
);
create index on projects (workspace_id, is_archived);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  title        text not null,
  description  text,
  status       task_status   not null default 'todo',
  priority     task_priority not null default 'medium',
  due_date     date,
  position     double precision not null default 0,  -- порядок у колонці
  created_by   uuid not null references profiles(id),
  assignee_id  uuid references profiles(id),          -- пост-MVP (команди)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on tasks (workspace_id, status, position);
create index on tasks (workspace_id, project_id);

create table labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#64748b',
  unique (workspace_id, name)
);

create table task_labels (
  task_id  uuid not null references tasks(id)  on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table time_entries (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  project_id   uuid not null references projects(id),
  task_id      uuid references tasks(id) on delete set null,
  entry_date   date not null,
  start_minute int  not null,
  end_minute   int  not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (start_minute >= 0 and end_minute <= 1440),
  check (start_minute < end_minute),
  -- ЗАБОРОНА ПЕРЕТИНУ: один користувач, один день, інтервали не накладаються
  constraint no_overlap exclude using gist (
    user_id    with =,
    entry_date with =,
    int4range(start_minute, end_minute) with &&
  )
);
create index on time_entries (workspace_id, user_id, entry_date);

-- автооновлення updated_at
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_tasks_updated   before update on tasks
  for each row execute function set_updated_at();
create trigger trg_entries_updated before update on time_entries
  for each row execute function set_updated_at();
```

**Чому `EXCLUDE USING gist` для перетину:** це гарантія на рівні БД — навіть якщо
UI помилиться чи прийде паралельний запит, Postgres відхилить запис, що
накладається. UI дублює перевірку для миттєвого фідбеку (без раунд-тріпу).

---

## 7. RLS-політики

```sql
-- 0003_rls.sql

-- helper: чи є поточний користувач членом workspace
create or replace function is_member(ws uuid) returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- увімкнути RLS
alter table profiles          enable row level security;
alter table user_settings     enable row level security;
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table projects          enable row level security;
alter table tasks             enable row level security;
alter table labels            enable row level security;
alter table task_labels       enable row level security;
alter table time_entries      enable row level security;

-- profiles / user_settings — лише власник
create policy own_profile  on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_settings on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workspaces — членам на читання; власнику на зміну
create policy ws_select on workspaces
  for select using (is_member(id));
create policy ws_modify on workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- workspace_members — членам видно склад; керує owner/admin (деталі — пост-MVP)
create policy wm_select on workspace_members
  for select using (is_member(workspace_id));

-- projects / tasks / labels — членам workspace
create policy proj_all on projects
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy task_all on tasks
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy label_all on labels
  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy task_labels_all on task_labels
  for all using (exists (
    select 1 from tasks t
    where t.id = task_labels.task_id and is_member(t.workspace_id)
  ));

-- time_entries — соло: лише власні записи (для команд пізніше розширимо до workspace)
create policy te_own on time_entries
  for all
  using (user_id = auth.uid() and is_member(workspace_id))
  with check (user_id = auth.uid() and is_member(workspace_id));
```

> На етапі команд `te_own` замінимо/доповнимо політикою «членам workspace видно
> чужі записи (за роллю)», лишивши запис/редагування лише власнику.

---

## 8. Авторизація і бутстрап користувача

**Логін:** email+пароль і Google OAuth (увімкнути провайдер у Supabase Auth).

**Бутстрап при реєстрації** — тригер на `auth.users`, що створює профіль,
налаштування, особистий workspace і членство `owner`:

```sql
-- 0004_triggers.sql
create or replace function handle_new_user() returns trigger as $$
declare ws_id uuid;
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
```

**Фронт:**

- `AuthProvider` тримає сесію (`supabase.auth.getSession` + `onAuthStateChange`).
- `ProtectedRoute` редіректить неавторизованих на `/login`.
- Активний workspace зберігаємо в стані/`localStorage` (у соло — єдиний особистий).

---

## 9. Доступ до даних (react-query)

**Клієнт:** `src/lib/supabase.ts` створює один інстанс із `VITE_SUPABASE_URL` та
`VITE_SUPABASE_ANON_KEY`.

**Типи:** генеруємо з БД — `supabase gen types typescript` → `src/types/database.ts`.

**Конвенція ключів кешу:**

```
['projects', workspaceId]
['tasks', workspaceId, { status?, projectId? }]
['time-entries', workspaceId, userId, weekStartISO]   // або dayISO
['labels', workspaceId]
['settings', userId]
['report', workspaceId, { from, to, groupBy }]
```

**Патерни:**

- Запити — у `src/queries/*` як хуки (`useProjects`, `useWeekEntries`, `useTasks`…).
- Мутації — `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry`, `useMoveTask`…
- **Оптимістичні апдейти** для drag-операцій (перетягування блоку часу, картки
  Kanban) — оновлюємо кеш одразу, відкат при помилці (особливо важливо для
  помилки `no_overlap` від БД → показати тост і повернути блок).
- Інвалідовуємо вузькі ключі (день/тиждень), не весь кеш.

---

## 10. Функціонал і UX-специфікації

### 10.1. Auth

- `/login`, `/register`, `/reset-password`.
- Email+пароль + кнопка «Увійти через Google».
- Після входу — редірект на `/timesheet`.

### 10.2. Layout

- Бічна навігація: **Таймшит / Задачі / Звіти / Проєкти / Налаштування**.
- Верх: назва активного workspace, перемикач теми, меню профілю (вихід).

### 10.3. Таймшит (ядро) ⭐

**Перемикач Тиждень ⇄ День** (за замовч. — останній обраний, fallback Тиждень).

- **Тиждень:** колонки = 7 днів (тиждень з понеділка, `week_start`), вертикальна
  вісь = час від `day_start_minute` до `day_end_minute`, поділки кожні
  `grid_step_minutes` (10 хв). Навігація: ‹ попередній / наступний › тиждень, «Сьогодні».
- **День:** один день на всю ширину, ширші блоки/описи.

**Створення запису (drag):**

1. Натиснув на порожньому слоті й тягнеш вертикально → прев'ю-блок, що снапиться
   до кроку 10 хв.
2. Відпустив → діалог: **проєкт** (обов'язково, select із кольорами), **опис**,
   **задача** (опц., пошук-комбобокс по задачах проєкту), час початку/кінця
   (підставлені, редаговані).
3. Збереження → блок фарбується кольором проєкту, показує опис + тривалість (год).

**Редагування:**

- Клік по блоку → попап/діалог з деталями: проєкт, опис, задача, час; кнопки
  «Зберегти», «Видалити».
- Тягнення країв блоку → зміна `start/end` (снап до 10 хв).
- Перетягування блоку → зміна часу/дня (у тижні).

**Заборона перетину:** під час drag прев'ю підсвічується червоним, якщо накладається
на існуючий блок; збереження заблоковане. БД-констрейнт `no_overlap` — остання лінія
захисту (тост «Інтервал перетинається з наявним записом»).

**Підсумки:** під кожним днем — сума годин (десяткові); збоку/зверху — тижнева сума
й розбивка по проєктах (кольорові бейджі з годинами).

**MVP:** без копіювання/повтору записів (це пост-MVP).

### 10.4. Задачі

**Перемикач Дошка ⇄ Список** (ті самі дані).

- **Дошка:** 3 колонки (To-do / In progress / Done). Картки drag&drop між
  колонками (зміна `status`) і всередині (зміна `position`). Картка показує:
  назву, бейдж проєкту (колір), пріоритет, дедлайн, теги.
- **Список:** таблиця/рядки з фільтрами — проєкт, пріоритет, статус, тег; сортування
  за пріоритетом/дедлайном/датою створення.
- **Діалог задачі:** назва, опис, проєкт, пріоритет, статус, дедлайн, теги
  (мульти-select із `labels`), + список прив'язаних `time_entries` із сумою годин.
- **Позиціонування:** `position` (double) — нова картка отримує
  `(сусід_зверху + сусід_знизу)/2`; зрідка — переіндексація колонки.

### 10.5. Проєкти

- Список (активні/архівні), створення/редагування: назва + колір (палітра +
  hex-інпут), архівування (архівні ховаються зі селектів, але історія лишається).

### 10.6. Звіти

- Вибір періоду (день/тиждень/місяць або довільний діапазон).
- Графіки (recharts): години по днях (бар), розподіл по проєктах (донат/бар).
- Таблиця підсумків: проєкт × години, загальна сума.
- **Експорт CSV:** колонки `date, project, task, description, hours` за період.

### 10.7. Налаштування

- Межі робочого дня (`day_start/end_minute`), крок сітки, перший день тижня,
  тема (світла/темна/системна), мова, профіль (ім'я, аватар).

### 10.8. Стани UI

- Кожен екран: loading (skeleton), empty (підказка + CTA), error (тост/банер).
- Тости — `sonner`. Підтвердження видалення — `alert-dialog`.

---

## 11. Роутинг

```
/login                 публічний
/register              публічний
/reset-password        публічний
/                      → редірект на /timesheet
/timesheet             сітка (тиждень/день), ?view=week|day&date=YYYY-MM-DD
/tasks                 дошка/список, ?view=board|list
/tasks/:taskId         діалог задачі (modal route)
/reports               звіти, ?from&to
/projects              проєкти
/settings              налаштування
*                      404
```

Усі, крім публічних, — під `ProtectedRoute`.

---

## 12. Дизайн / UI

- **Дизайн-система:** shadcn/ui (нейтральна база) + Tailwind токени; CSS-змінні для
  тем (світла/темна через `next-themes`).
- **Кольори проєктів** задає користувач — акцент у сітці та на картках (як кольорове
  кодування в нинішньому Excel). Зберігаємо hex.
- **Десктоп-first**: щільна інформативна сітка.
- **i18n:** усі рядки через `t('key')`; файли `src/i18n/uk.json` (далі легко `en.json`).
  Структура ключів за фічами: `timesheet.*`, `tasks.*`, `projects.*`, `reports.*`,
  `auth.*`, `common.*`.
- **Компоненти shadcn (кандидати):** `dialog`, `alert-dialog`, `popover`, `select`,
  `command` (комбобокс), `calendar`, `tabs`, `dropdown-menu`, `badge`, `card`,
  `sonner`, `sheet`, `tooltip`, `skeleton`, `form`, `input`, `textarea`, `switch`.

---

## 13. Структура проєкту

```
tht/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                     # провайдери: QueryClient, Theme, Auth, i18n, Router
│  ├─ lib/
│  │  ├─ supabase.ts              # клієнт
│  │  ├─ time.ts                  # хвилини↔год, форматування, снап до кроку
│  │  └─ utils.ts                 # cn() та ін.
│  ├─ components/
│  │  ├─ ui/                      # згенеровані shadcn-компоненти
│  │  └─ layout/                  # AppShell, Sidebar, Topbar
│  ├─ features/
│  │  ├─ auth/                    # LoginForm, RegisterForm, AuthProvider, ProtectedRoute
│  │  ├─ timesheet/               # Grid, DayColumn, EntryBlock, EntryDialog, useDragCreate
│  │  ├─ tasks/                   # Board, Column, TaskCard, TaskList, TaskDialog
│  │  ├─ projects/                # ProjectList, ProjectDialog, ColorPicker
│  │  ├─ reports/                 # ReportFilters, Charts, SummaryTable, exportCsv
│  │  └─ settings/                # SettingsForm
│  ├─ queries/                    # useProjects, useWeekEntries, useTasks, useMutations…
│  ├─ hooks/                      # useActiveWorkspace, useDebounce…
│  ├─ routes/                     # роутер + сторінки-обгортки
│  ├─ i18n/
│  │  ├─ index.ts
│  │  └─ uk.json
│  ├─ types/
│  │  ├─ database.ts              # згенеровані Supabase типи
│  │  └─ domain.ts                # доменні типи/enum-и
│  └─ styles/
│     └─ globals.css
├─ supabase/
│  ├─ config.toml                 # supabase CLI
│  ├─ migrations/                 # 0001_…  0002_…  …
│  └─ seed.sql                    # тестові проєкти/задачі для локалі
├─ public/
├─ .env.local                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├─ .env.example
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ components.json                # конфіг shadcn
├─ tsconfig.json
├─ CLAUDE.md
└─ PLAN.md
```

---

## 14. Конвенції коду

- **TypeScript строгий** (`strict: true`); жодних `any` без причини.
- **Аліас імпорту** `@/` → `src/`.
- **Файли:** компоненти — `PascalCase.tsx`; хуки — `useThing.ts`; утиліти — `camelCase.ts`.
- **Структура за фічами** (`features/*`), спільне — у `components/ui`, `lib`, `hooks`.
- **Дані лише через `queries/*`** (react-query). Компоненти не звертаються до
  `supabase` напряму.
- **Форми:** `react-hook-form` + `zod`-резолвер; схеми поряд із фічею.
- **Час:** уся арифметика — через `lib/time.ts` (хвилини як джерело істини,
  год = десяткові). Жодних `new Date()`-маніпуляцій із часом доби у компонентах.
- **i18n:** ніяких хардкод-рядків у JSX — лише `t(...)`.
- **Іменування БД:** `snake_case`; у TS-доменних типах — `camelCase` (мапінг у queries).
- **Lint/format:** eslint + prettier; коміт без помилок лінтера.

---

## 15. Dev-воркфлоу і середовища

**Локальна розробка — Supabase CLI (Docker):**

- `supabase init` (один раз) → `supabase/`.
- `supabase start` → піднімає локальний Postgres+Auth+Studio у Docker.
- Міграції в `supabase/migrations/`; `supabase db reset` застосовує їх + `seed.sql`.
- `supabase gen types typescript --local > src/types/database.ts`.
- `.env.local` вказує на локальний URL/anon-key (їх друкує `supabase start`).
- _Вимога:_ встановлений Docker Desktop.

**Середовища:**
| Середовище | Supabase | Призначення |
|---|---|---|
| local | CLI/Docker | щоденна розробка |
| prod | окремий хмарний проєкт | реальні дані |

- Міграції котимо в prod через `supabase db push` (або linked-проєкт).
- Окремі `.env.local` (dev) і `.env.production` (build для VPS).
- **Ніколи** не комітити справжні ключі; `.env*` у `.gitignore`, є `.env.example`.

**Скрипти (`package.json`):**

```
dev        vite
build      tsc -b && vite build
preview    vite preview
lint       eslint .
test       vitest
db:start   supabase start
db:reset   supabase db reset
db:types   supabase gen types typescript --local > src/types/database.ts
```

---

## 16. Деплой

**Фронтенд (як ваші теперішні React-проєкти):**

1. `pnpm build` → `dist/` (зі `VITE_SUPABASE_URL/ANON_KEY` prod-проєкту).
2. Залити `dist/` на VPS; nginx роздає статику зі **SPA-fallback** на `index.html`.
3. Домен/піддомен + SSL (Let's Encrypt). Приклад nginx:
   ```nginx
   location / { try_files $uri /index.html; }
   ```

**Бекенд:** Supabase хмара — деплоїти нічого. Міграції — `supabase db push`.
Google OAuth: додати redirect-URL продакшн-домену в Supabase Auth + Google Console.

---

## 17. Edge-кейси і правила

- **Перетин записів:** заборонено (BD `EXCLUDE` + UI-перевірка). Тост при конфлікті.
- **Межі дня:** запис не може виходити за `day_start/end_minute`; зміна меж у
  налаштуваннях не видаляє старі записи поза новими межами — вони лишаються видимі
  (сітка авто-розширюється, щоб їх показати).
- **Архівований проєкт:** не з'являється в селектах нових записів, але історичні
  записи/задачі лишаються й коректно рахуються у звітах.
- **Видалення проєкту:** заблокувати, якщо є записи; пропонувати архівувати.
  (FK `time_entries.project_id` без `on delete` → видалення впаде; ловимо й пояснюємо.)
- **Видалення задачі:** `time_entries.task_id → set null` (записи лишаються).
- **Тиждень/межі тижня:** з понеділка (`week_start`); навігація не «перестрибує» дані.
- **Порожні описи** дозволені; проєкт — обов'язковий.
- **Снапінг:** усі межі кратні `grid_step_minutes`; некратні значення округлюються.
- **Конкурентність:** оптимістичні апдейти з відкатом на помилку RLS/констрейнта.

---

## 18. Дорожня карта

### Phase 0 — Каркас ✅ (завершено 2026-06-23)

- [x] pnpm + Vite + React + TS; eslint/prettier; аліас `@/`
- [x] Tailwind + shadcn/ui; теми (світла/темна) через next-themes
- [x] `supabase init`, локальний стек у Docker, `.env.local`
- [x] Міграції 0001–0004 (схема, RLS, тригери, гранти); `seed.sql`; генерація типів
- [x] Auth (email+пароль, Google), AuthProvider, ProtectedRoute, бутстрап workspace
- [x] QueryClient, supabase-клієнт, i18n (uk), роутер, AppShell+Sidebar

> Примітки з реалізації:
>
> - RLS-міграція додатково робить `grant ... to authenticated` (table-level привілеї
>   потрібні поверх політик, інакше PostgREST дає `42501`).
> - Seed вставляє тестового користувача (`test@tht.local` / `password123`) з
>   порожніми токен-колонками в `auth.users` (NULL ламає GoTrue → 500 на логіні).
> - TS 6 більше не приймає `baseUrl` — аліас `@/` живе лише через `paths`.

### Phase 1 — Проєкти ✅ (завершено 2026-06-23)

- [x] `useProjects` + CRUD (`queries/projects.ts`); ColorPicker (пресети + hex); архівування
- [x] Сторінка: таби активні/архівні, діалог створення/редагування, видалення з
      підтвердженням; FK-помилка (23503) при видаленні проєкту із записами → тост
      «заархівуйте». Перевірено наскрізь по REST під RLS.

### Phase 2 — Таймшит (ядро) ⭐ — переважно завершено (2026-06-23)

- [x] `lib/time.ts` (хвилини↔год, снап, формат десяткових, HH:MM) + тести; `lib/dates.ts`
- [x] Сітка Тиждень/День (`?view=&date=`), межі з налаштувань (авто-розширення під
      записи поза робочим днем), навігація ‹/›/Сьогодні
- [x] Drag-створення (снап до кроку, прев'ю, червоне при перетині) + EntryDialog
      (проєкт із кольорами / опис / час) + оптимістичні апдейти
- [x] Редагування часу й полів через діалог; видалення (оптимістичне)
- [ ] Drag країв (resize) і перетягування блоку (move/across-day) — лишилось
- [x] UI-перевірка перетину + обробка BD-констрейнта `23P01` (тост)
- [x] Денні/тижневі підсумки + розбивка по проєктах (бейджі)
- [ ] Опц. зв'язок запису з задачею (task picker) — додамо у Phase 3, коли є задачі

### Phase 3 — Задачі ✅ (завершено 2026-06-23)

- [x] CRUD задач (`queries/tasks.ts`); теги (`queries/labels.ts`) + task_labels
      (set-замість-merge); інлайн-створення тегів у `LabelPicker`
- [x] Дошка (3 колонки, dnd-kit: drag-ручка, `closestCorners`, status+дробова position,
      оптимістичний `useMoveTask`) + Список (фільтри статус/пріоритет/проєкт + сортування)
- [x] TaskDialog з усіма полями (назва/опис/проєкт/статус/пріоритет/дедлайн/теги);
      показ суми залогованих годин (`useTaskMinutes`). Перевірено наскрізь по REST.

> Лишилось дрібне: повноцінна прив'язка time_entry → task у EntryDialog (task picker)
> — хвіст Phase 2; зробимо разом із поліровкою.

### Phase 4 — Звіти ✅ (завершено 2026-06-23)

- [x] Фільтри періоду (від/до + пресети «цей тиждень/місяць», стан у URL `?from&to`)
- [x] Графіки (recharts): години по днях (бар), розподіл по проєктах (донат)
- [x] Таблиця підсумків проєкт × години + загальна сума
- [x] Експорт CSV (`lib/csv.ts`, BOM для Excel): date, project, task, description, hours

### Phase 5 — Поліш і деплой ✅ (завершено 2026-06-23)

- [x] Налаштування (межі дня, крок, перший день тижня, тема, профіль) —
      `features/settings`, `queries/settings.ts` (update), `queries/profile.ts`
- [x] Loading (skeleton) / empty / error стани; тости (`sonner`); підтвердження видалення
- [x] Lazy-роутинг (recharts/dnd-kit поза стартовим бандлом: 1360kB → 468kB)
- [x] Хвіст Phase 2: drag-resize блоків (ручки країв) + task-picker в EntryDialog
- [x] Деплой-артефакти: `deploy/nginx.conf.sample`, `deploy/README.md`,
      `.env.production.example` (фактичний деплой на VPS — за наявності доступу)

> Лишилось зробити вручну при наявності доступу: прод-Supabase (link + db push),
> Google OAuth redirect-URL, заливка `dist/` на VPS + SSL — кроки в `deploy/README.md`.

### Надійність / auth (2026-06-23)

- [x] Скидання пароля: `/reset-password` (запит листа) + `/update-password`
      (новий пароль із recovery-сесії); «Забули пароль?» на логіні. Перевірено: лист
      доходить у Mailpit.
- [x] UX підтвердження email при реєстрації (немає сесії → «перевірте пошту», а не
      мовчазний редірект на /login).
- [x] Error boundary на маршрутах (`RouteError`) — без білого екрана при збоях
      рендера/завантаження lazy-чанків.

### UX / анімації (2026-06-23)

- [x] Точковий polish через `motion` (`LazyMotion`+`domAnimation`, `m`-компоненти,
      `reducedMotion="user"`): fade-перехід між сторінками, поява карток канбану й
      блоків таймшита, поп бейджа дзвіночка. Бандл +~43kB gzip (свідомо).

### Пост-MVP (беклог)

- [x] **Команди** (2026-06-23): кілька workspace + перемикач, створення простору,
      запрошення наявних користувачів (rpc `invite_member`), ролі (owner/admin/member),
      assignee на задачах, RLS під команди (члени бачать чужі записи, пишуть лише свої;
      профілі видимі співучасникам). **Realtime — ще ні** (наступний крок команд).
      Міграція `0005_teams.sql`; усі security-definer функції з `set search_path=public`.
- [x] **Швидкий ввід** (2026-06-23): дублювання запису (у найближчий вільний слот —
      `findFreeSlot` + тести), копія дня/тижня в наступний період (bulk-вставка з
      пропуском перетинів `useBulkCreateEntries`, тост зі звітом created/skipped).
- [x] **Мобільний** (2026-06-23): бургер-меню (Sheet-drawer) + десктоп-сайдбар
      ховається < lg; адаптивні відступи; канбан і тижнева сітка — горизонтальний
      скрол із мін-шириною колонок; мобільна FAB-кнопка швидкого додавання запису
      (найближчий вільний слот видимого дня).
- [x] **Білінг** (2026-06-23): погодинна ставка на проєкті (`hourly_rate`, міграція
      `0006_billing.sql`), валюта в налаштуваннях; у звітах — суми до оплати
      (проєкт × години × ставка), загальна сума, колонка «Сума» в CSV. Ставка по
      клієнту — разом із пунктом «Клієнти».
- [ ] **Клієнти:** рівень client → projects
- [x] **Імпорт CSV** (2026-06-23): завантаження CSV записів часу
      (колонки дата/проєкт/початок/кінець/опис, укр+англ заголовки, дати РРРР-ММ-ДД
      і ДД.ММ.РРРР), автостворення відсутніх проєктів, пропуск перетинів; діалог у
      Налаштуваннях. `lib/importParse.ts` (власний CSV-парсер) + тести.
      XLSX-імпорт прибрано (2026-06-24, аудит безпеки): SheetJS мав HIGH-вразливості
      (prototype pollution / ReDoS), патч лише поза npm — лишили безпечний CSV-шлях.
- [x] **Сповіщення/нагадування** (2026-06-23, внутрішні): класифікація дедлайнів
      (`lib/dueDate.ts` + тести — прострочено/сьогодні/скоро), дзвіночок у топбарі зі
      списком і лічильником, кольорова підсвітка дедлайну на картці/у списку задач.
      Пуші/email — лишаються на потім (потрібен сервер/крон).
- [ ] Експорт Excel (xlsx — лише з безпечного джерела/CDN); налаштовувані Kanban-колонки

---

## 19. Відкриті питання

- Фінальний домен/піддомен для прод-деплою (узгодити доступ до VPS і Node не треба,
  лише статика+nginx).
- Чи виносити Kanban-колонки в налаштовувані — поки фіксовані 3.
- ~~Чи потрібен «довільний діапазон» у звітах~~ → зроблено: від/до + пресети.
- Логотип/брендинг — за потреби пізніше.
