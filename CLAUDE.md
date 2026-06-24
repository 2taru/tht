# CLAUDE.md

Інструкції для роботи над цим репозиторієм. Перед більшими задачами звіряйся з
**`PLAN.md`** — це джерело істини по архітектурі, схемі БД, UX і дорожній карті.

## Що це за проєкт
`tht` (Track Hours & Tasks) — веб-трекер часу + менеджер задач під особистий
воркфлоу, з прицілом вирости в командний інструмент. Соло-MVP, але БД/RLS одразу
multi-tenant (`workspace_id` всюди). Мова продукту — українська (i18n-ready).

## Поточний стан
**MVP завершено (Phase 0–5).** Каркас, БД, auth, layout, проєкти, таймшит (сітка
тиждень/день, drag-створення + drag-resize, task-picker, перетин), задачі (Kanban +
список + теги), звіти (графіки + CSV), налаштування (межі дня/крок/тиждень/тема/
профіль). Lazy-роутинг. `build`/`lint`/`test` зелені; шляхи даних перевірено під RLS.
Деплой описаний у `deploy/README.md` (виконати при доступі до VPS/прод-Supabase).

**Пост-MVP:** ✅ **Команди** (міграція `0005_teams.sql`): кілька workspace +
перемикач у топбарі, створення простору, запрошення наявних користувачів
(rpc `invite_member`), ролі, assignee на задачах, team-RLS (члени бачать чужі
записи, пишуть лише свої; профілі видимі співучасникам). **Командна робота**
(міграція `0010_workspace_management.sql`): звіти по команді (фільтр учасника +
розбивка «години по людях» — лише owner/admin; member бачить власні години),
фільтр задач за виконавцем (board+list), керування простором у Команді —
перейменування (owner/admin), вихід учасника (`wm_leave`, не для owner),
видалення простору owner-ом (каскад; кнопка лише коли є інший простір).
**Командний UX:** дзвіночок сповіщень має перемикач «Усі/Мої» (фільтр дедлайнів за
assignee, дефолт «Усі» — бо в соло задачі без виконавця; вибір у localStorage
`tht.notifyScope`); видалення проєктів і задач лише для owner/admin — UI-гейтинг
(хук `useMyRole`) + RLS-бекап (міграція `0011`: `proj_delete`/`task_delete` через
`is_owner_or_admin`, решта CRUD — усім членам); онбординг-підказки в таймшиті
(банер + хінт у діалозі запису, коли в просторі ще немає проєктів).
**Актуалізація даних:** замість realtime — легкий пулінг (React Query
`refetchInterval` 120с лише у фокусі + `refetchOnWindowFocus` + ручна кнопка
«Оновити» в топбарі, `RefreshButton`). Свідомо без websockets через малу кількість
користувачів; realtime — за потреби в майбутньому.
⚠️ Усі `security definer` функції ОБОВʼЯЗКОВО з `set search_path = public`
(інакше тригери на auth падають у контексті GoTrue). ✅ **Швидкий ввід**:
дублювання запису в найближчий вільний слот (`findFreeSlot`), копія дня/тижня в
наступний період (`useBulkCreateEntries`, пропуск перетинів). ✅ **Auth/надійність**:
скидання пароля (`/reset-password` + `/update-password`), UX підтвердження email,
route-level error boundary (`RouteError`), **Google OAuth** (спільний
`GoogleButton` на login/register, `signInWithOAuth`); `signUp` передає
`emailRedirectTo` на наш домен, інакше лінк підтвердження веде на дефолтний Site
URL (на проді задати Site URL/Redirect URLs у дашборді — деталі `deploy/README.md`).
✅ **Мобільна адаптація**: бургер-drawer
(`MobileNav`/Sheet), сайдбар ховається < lg, канбан/тижнева сітка з горизонтальним
скролом, мобільна FAB швидкого додавання. ✅ **Білінг** (`0006_billing.sql`): погодинна
ставка на проєкті + валюта в налаштуваннях; у звітах суми до оплати + CSV-колонка
«Сума» (`lib/money.ts`). ✅ **Імпорт CSV** записів часу (`lib/importParse.ts`,
`queries/import.ts`, діалог у Налаштуваннях): автостворення проєктів, пропуск
перетинів. (XLSX-імпорт прибрано — SheetJS мав HIGH-вразливості, патч лише поза npm;
лишився власний безпечний CSV-парсер.) ✅ **Внутрішні сповіщення** (`lib/dueDate.ts`, `NotificationsBell`):
дзвіночок зі списком дедлайнів (прострочено/сьогодні/скоро) + кольорова підсвітка на
картці/у списку задач. ✅ **Анімації**: точковий polish через `motion`
(`LazyMotion`+`domAnimation`, `m`-компоненти, `reducedMotion="user"`) — переходи
сторінок, поява карток/блоків. Нові анімації — лише `m.*` (strict-режим заборонить
`motion.*`). ✅ **Таймшит UX**: сітка масштабується під висоту екрана
(`pxPerMin` рахується з `ResizeObserver`, межі `MIN/MAX_PX_PER_MIN` у `geometry.ts`),
drag-виділення показує тривалість («X год Y хв») і не відкриває діалог одразу —
зберігання через кнопку-галочку (`pending` у `DayColumn`); взаємодія зі слотом —
зонна (`computeZone` у `EntryBlock`): ліва третина = редагування (cursor-pointer),
права = перенесення (cursor-grab + іконка Move), краї середини (±10px) = ресайз із
motion-грипами; перетягування слота по вертикалі (час) і горизонталі (інший день у
видимому тижні — `dayAtX` за X-координатою колонки) → діалог «перенести / дублювати»
(`onRequestMove` → `applyMove` у `TimesheetPage`, валідація перетину на цільовому дні). Далі по беклогу — realtime для команд / експорт xlsx / налаштовувані
Kanban-колонки (клієнтів свідомо пропустили). Оновлюй у міру появи коду.

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
- **UI-конвенції заокруглень** (тримати на токен-шкалі, без bare `rounded`=4px):
  панелі/картки/діалоги/списки/empty-states — `rounded-lg` (Card теж переведено на
  `rounded-lg`); контроли (button/input/select) — `rounded-md`; пункти меню/тогли/
  focus-таргети — `rounded-sm`; беджі/пігулки/аватари/дотики — `rounded-full`.
  Empty-state — `rounded-lg border border-dashed p-8 text-center text-muted-foreground`.
  Анімації появи — `m.*` із tween `duration: 0.15`; інтерактивні — spring.
- **Ширина сторінок:** центровані сторінки (звіти/налаштування/проєкти/команда) —
  єдиний контейнер `mx-auto max-w-4xl space-y-6` (щоб поля по ширині збігалися між
  сторінками). Робочі поверхні (таймшит/задачі) — full-bleed `flex h-full flex-col gap-4`.

## Відомі нюанси / QA
- **Харднінг RLS** (міграція `0009`): `is_member` отримав `set search_path = public`
  (був єдиним security-definer без нього); `invite_member` тепер забороняє роль
  `owner` (бо SECURITY DEFINER обходить RLS і міг обійти захист owner-рядка з `0007`).
- **RLS команд** (міграція `0007`): owner-рядок `workspace_members` захищений —
  ні admin, ні хтось інший не може його видалити/понизити, і ніхто не підвищується
  до `owner` через API (передача власності — окрема майбутня фіча). service_role має
  table-grants (потрібно для адмін-тулінгу/Edge Functions).
- **Керування простором** (міграція `0010`): `wm_leave` дозволяє видалити ВЛАСНЕ
  членство (ORиться з `wm_delete`), але `role <> 'owner'` лишає owner-рядок недоторканим
  → owner не «виходить», а видаляє простір. `ws_update` додає ренейм для admin (видалення
  простору лишається owner-у через `ws_modify FOR ALL`). Видалення простору каскадить на
  проєкти/задачі/записи (FK `on delete cascade`); у UI кнопка delete лише коли є інший
  простір (щоб не лишити юзера без жодного).
- **Гейтинг видалення** (міграція `0011`): `proj_all`/`task_all` (`for all`) розбиті на
  select/insert/update (усі члени) + delete (лише `is_owner_or_admin`). RLS не кидає
  помилку на заблокований DELETE — просто 0 рядків (тихо нічого не видаляє); у UI
  кнопки видалення сховані для member (`useMyRole`), тож на практиці тиха відмова не
  виникає. Якщо колись зʼявиться delete-екшн без гейтингу — додати перевірку count.
- **Безпека експорту/імпорту**: CSV-експорт екранує комірки-формули (`= + - @ tab CR`
  → префікс `'`) проти CSV/formula injection (`lib/csv.ts` + тести). Імпорт — лише CSV
  (XLSX/SheetJS прибрано через HIGH-вразливості); CSV-рядки в `Object.create(null)`.
  `pnpm audit` має лишатися чистим — не повертати `xlsx`.
- **Локальний auth після `db:reset`**: Kong/GoTrue інколи десинкають (`502` чи
  «invalid response from upstream»). Це **не баг застосунку** —
  `docker restart supabase_auth_tht supabase_kong_tht` і зачекати `/auth/v1/health`=200.

## Гайдрейли
- Не комітити секрети: `.env*` у `.gitignore`, є `.env.example`. Ключі Supabase —
  через `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Перед зміною БД-схеми/RLS перечитай `PLAN.md` розділи 5–8.
- Працюй по фазах із дорожньої карти (`PLAN.md` розділ 18); не тягни пост-MVP
  (команди, мобілка, білінг, імпорт) у MVP без потреби.
- Після значущих змін онови відповідні розділи `PLAN.md` і цей файл.
