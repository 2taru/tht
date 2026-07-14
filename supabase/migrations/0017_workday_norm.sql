-- 0017_workday_norm.sql — норма робочого часу (тривалість дня + робочі дні тижня)

-- Тривалість робочого дня у хвилинах (для розрахунку планової норми годин).
alter table user_settings add column work_day_minutes int not null default 480; -- 8 год
alter table user_settings add constraint work_day_minutes_range
  check (work_day_minutes > 0 and work_day_minutes <= 1440);

-- Робочі дні тижня: масив 0..6, де 0 = неділя … 6 = субота (як JS getDay()).
-- Дефолт — пн–пт.
alter table user_settings add column work_days int[] not null default '{1,2,3,4,5}';
alter table user_settings add constraint work_days_valid
  check (work_days <@ array[0,1,2,3,4,5,6]);
