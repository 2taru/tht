# CLAUDE.md

Інструкції для роботи над цим репозиторієм. Перед більшими задачами звіряйся з
**`PLAN.md`** — це джерело істини по архітектурі, схемі БД, UX і дорожній карті.

## Що це за проєкт
`tht` (Track Hours & Tasks) — веб-трекер часу + менеджер задач під особистий
воркфлоу, з прицілом вирости в командний інструмент. Соло-MVP, але БД/RLS одразу
multi-tenant (`workspace_id` всюди). Мова продукту — українська (i18n-ready).

## Поточний стан
**Phase 0–2 завершено** (Phase 2 — без drag-resize/move блоків; редагування поки
через діалог). Каркас, БД, auth, layout, CRUD проєктів, **таймшит-ядро**
(`features/timesheet`, `queries/timeEntries.ts`, `queries/settings.ts`): сітка
тиждень/день, drag-створення зі снапом і прев'ю, EntryDialog (створення/редагування/
видалення), перевірка перетину (UI + констрейнт `23P01`), денні/тижневі підсумки,
оптимістичні апдейти. `build`/`lint`/`test` зелені; читання/запис/перетин перевірено
під RLS. Наступне — **Phase 3 (Задачі)** + хвіст Phase 2 (drag-resize, task-picker).
Цей файл оновлюй у міру появи реального коду/скриптів.

**Локальний вхід (seed):** `test@tht.local` / `password123`. Dev-сервер слухає на
`localhost:5173` (IPv6 — звертайся `localhost`, не `127.0.0.1`).

## Стек
- **Фронт:** Vite + React + TypeScript + Tailwind + shadcn/ui, pnpm
- **Бек/БД:** Supabase (PostgreSQL + Auth + RLS); власного сервера немає —
  React ходить у Supabase напряму через `supabase-js`
- **Дані:** @tanstack/react-query; **форми:** react-hook-form + zod;
  **DnD:** @dnd-kit; **дати:** date-fns; **i18n:** react-i18next; **графіки:** recharts
- **Деплой:** фронт — статика на VPS (nginx, SPA-fallback); бек — Supabase хмара

## Команди
```
pnpm dev            # vite (localhost:5173)
pnpm build          # tsc -b && vite build
pnpm lint           # eslint .
pnpm format         # prettier --write .
pnpm test           # vitest
pnpm db:start       # supabase start (Docker)
pnpm db:stop        # supabase stop
pnpm db:reset       # supabase db reset (міграції + seed)
pnpm db:types       # gen types → src/types/database.ts
```
Supabase CLI підключено як dev-залежність (`pnpm exec supabase …`).
Локальна БД — через Supabase CLI у Docker (потрібен Docker Desktop). Окремий
хмарний prod-проєкт. Деталі — `PLAN.md` розділ 15.

## Структура (цільова)
`src/features/*` — фічі (auth, timesheet, tasks, projects, reports, settings).
`src/components/ui` — shadcn. `src/queries/*` — увесь доступ до Supabase.
`src/lib/` — `supabase.ts`, `time.ts`, `utils.ts`. `supabase/migrations/` — SQL.
Повне дерево — `PLAN.md` розділ 13.

## Правила, яких треба триматися
- **Дані — лише через `src/queries/*`** (react-query). Компоненти не звертаються до
  `supabase` напряму.
- **Час = хвилини від півночі (int)** — джерело істини. Уся арифметика часу через
  `src/lib/time.ts`; години показуємо **десятковими** (6.5). Жодних маніпуляцій із
  часом доби через `new Date()` у компонентах. `entry_date` — локальна дата без TZ.
- **Записи часу не перетинаються** — гарантія в БД (`EXCLUDE USING gist`) + перевірка
  в UI. При конфлікті лови помилку констрейнта й показуй тост, роби відкат
  оптимістичного апдейту.
- **RLS — на всіх таблицях.** Кожна прикладна таблиця має `workspace_id`; нічого не
  читаємо/пишемо в обхід політик. Зміни схеми — лише через нову міграцію в
  `supabase/migrations/`, тоді `db:reset` і `db:types`.
- **i18n:** жодних хардкод-рядків у JSX — лише `t('...')`; ключі за фічами в
  `src/i18n/uk.json`.
- **TS строгий**, без зайвих `any`. Аліас імпорту `@/` → `src/`.
- **БД — snake_case**, доменні TS-типи — camelCase (мапінг у `queries`).
- Тема світла/темна через next-themes; кольори проєктів — користувацькі hex.

## Гайдрейли
- Не комітити секрети: `.env*` у `.gitignore`, є `.env.example`. Ключі Supabase —
  через `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Перед зміною БД-схеми/RLS перечитай `PLAN.md` розділи 5–8.
- Працюй по фазах із дорожньої карти (`PLAN.md` розділ 18); не тягни пост-MVP
  (команди, мобілка, білінг, імпорт) у MVP без потреби.
- Після значущих змін онови відповідні розділи `PLAN.md` і цей файл.
