# Деплой tht

Фронт — статика на VPS (nginx). Бек — Supabase хмара. Деталі: `PLAN.md` розділ 16.

## 1. Прод-Supabase (один раз)
1. Створити хмарний проєкт на supabase.com.
2. Залінкувати CLI і накотити міграції:
   ```
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push          # застосує supabase/migrations/*
   ```
3. Auth → URL Configuration: додати прод-домен у Site URL і Redirect URLs.
4. Google OAuth: увімкнути провайдера, вставити Client ID/Secret; у Google Cloud
   Console додати `https://<ref>.supabase.co/auth/v1/callback` у Authorized redirect URIs.

## 2. Білд фронта
```
cp .env.production.example .env.production   # вставити прод URL + anon key
pnpm build                                   # → dist/
```

## 3. nginx на VPS
1. Залити вміст `dist/` у `root` (напр. `/var/www/tht`).
2. Взяти `deploy/nginx.conf.sample`, підставити домен, покласти в `sites-available`,
   увімкнути симлінком, `nginx -t && systemctl reload nginx`.
3. SSL: `certbot --nginx -d tht.example.com`.

## Оновлення
- Код фронта: `pnpm build` → перезалити `dist/`.
- Зміни схеми БД: нова міграція в `supabase/migrations/` → `supabase db push`.
