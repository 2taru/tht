-- 0006_billing.sql — ставки по проєкту + валюта

-- Погодинна ставка проєкту (null = не білиться). numeric для точних грошей.
alter table projects add column hourly_rate numeric;
alter table projects add constraint hourly_rate_nonneg
  check (hourly_rate is null or hourly_rate >= 0);

-- Валюта користувача для відображення сум.
alter table user_settings add column currency text not null default 'UAH';
