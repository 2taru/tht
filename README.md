# tht — Track Hours & Tasks

Веб-трекер часу + менеджер задач під особистий воркфлоу, з прицілом вирости в
командний інструмент. Облік часу на інтервальній сітці (тиждень/день), Kanban-дошка
задач, проєкти, звіти й білінг. Мова продукту — українська (i18n-ready), БД одразу
multi-tenant (`workspace_id` всюди) під майбутні команди.

> **Стек:** Vite + React + TypeScript + Tailwind + shadcn/ui, Supabase (PostgreSQL +
> Auth + RLS). Власного бекенду немає — фронт ходить у Supabase напряму через
> `supabase-js`, захист даних — RLS у Postgres.

## Можливості

- **Таймшит** — сітка тиждень/день; створення записів кліком або протягуванням,
  drag-resize, перенос між днями (перенести/дублювати), редаговане виділення перед
  збереженням, масштабування сітки під висоту екрана.
- **Задачі** — Kanban (To-do / In progress / Done) + список, теги, пріоритети,
  дедлайни, assignee, опційний звʼязок із записами часу.
- **Проєкти** — плаский список: назва, колір, архівування, погодинна ставка.
- **Звіти** — підсумки по дню/тижню/місяцю та по проєктах, графіки, суми до оплати,
  експорт CSV.
- **Команди** — кілька workspace, запрошення, ролі, team-RLS.
- **Імпорт** записів часу з CSV, внутрішні сповіщення про дедлайни.
- **Налаштування** — межі дня, крок сітки (15/30/60 хв), початок тижня, тема
  (світла/темна), валюта, профіль.
- **Auth** — email+пароль і Google OAuth, скидання пароля, підтвердження email.

## Стек

| Шар | Технології |
| --- | --- |
| Фронт | Vite, React, TypeScript, Tailwind, shadcn/ui, pnpm |
| Дані | `@tanstack/react-query`, форми — `react-hook-form` + `zod` |
| UI/UX | `@dnd-kit`, `date-fns`, `react-i18next`, `recharts`, `motion`, `next-themes` |
| Бек/БД | Supabase (PostgreSQL + Auth + RLS) |
| Деплой | фронт — статика на VPS (nginx, SPA-fallback); бек — Supabase хмара |

## Швидкий старт

**Передумови:** Node.js, [pnpm](https://pnpm.io/), Docker Desktop (для локальної
Supabase через CLI).

```bash
# 1. Залежності
pnpm install

# 2. Локальна Supabase (Postgres + Auth + Studio у Docker)
pnpm db:start        # надрукує локальні URL та anon key
pnpm db:reset        # накотить міграції + seed

# 3. Змінні оточення
cp .env.example .env.local
# впиши VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY зі стартового виводу

# 4. Запуск
pnpm dev             # http://localhost:5173
```

**Локальний тестовий вхід (seed):** `test@tht.local` / `password123`.

> Dev-сервер слухає IPv6 — звертайся `localhost`, не `127.0.0.1`.

## Команди

| Команда | Опис |
| --- | --- |
| `pnpm dev` | Dev-сервер Vite (localhost:5173) |
| `pnpm build` | `tsc -b && vite build` → `dist/` |
| `pnpm preview` | Локальний прев'ю прод-білда |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest |
| `pnpm db:start` / `db:stop` | Підняти / зупинити локальну Supabase |
| `pnpm db:reset` | Перекотити міграції + seed |
| `pnpm db:types` | Згенерувати TS-типи БД → `src/types/database.ts` |

## Структура

```
src/
  features/     # фічі: auth, timesheet, tasks, projects, reports, settings
  components/ui # shadcn-компоненти
  queries/      # увесь доступ до Supabase (react-query)
  lib/          # supabase.ts, time.ts, dates.ts, utils.ts …
  i18n/         # uk.json
supabase/
  migrations/   # SQL-міграції 0001…0008
  seed.sql      # тестові дані для локалі
deploy/         # nginx-семпл + інструкція деплою
```

Ключові домовленості (повністю — у [`CLAUDE.md`](./CLAUDE.md)):

- Дані — лише через `src/queries/*`; компоненти не звертаються до `supabase` напряму.
- Час = хвилини від півночі (int); години показуємо десятковими. Уся арифметика —
  через `src/lib/time.ts`.
- Записи часу не перетинаються (DB exclusion constraint + перевірка в UI).
- RLS на всіх таблицях; кожна прикладна таблиця має `workspace_id`. Зміни схеми —
  лише через нову міграцію в `supabase/migrations/`.
- i18n: жодних хардкод-рядків у JSX — лише `t('...')`.

## Деплой

Фронт — статика на VPS (nginx), бек — Supabase хмара. Коротко:

```bash
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push          # накотити migrations/* на прод
cp .env.production.example .env.production   # прод URL + anon key
pnpm build                                   # → dist/ → на nginx
```

Повна інструкція (Auth URL config, Google OAuth, nginx, SSL) — у
[`deploy/README.md`](./deploy/README.md).

## Документація

- [`PLAN.md`](./PLAN.md) — джерело істини: архітектура, схема БД, RLS, UX, дорожня карта.
- [`CLAUDE.md`](./CLAUDE.md) — конвенції коду й нюанси для роботи над репозиторієм.
