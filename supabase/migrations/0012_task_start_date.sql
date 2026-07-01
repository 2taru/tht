-- 0012_task_start_date.sql — діапазон дат задачі (від–до)
-- Було: один дедлайн (due_date). Стало: опційна дата початку (start_date) +
-- опційний дедлайн (due_date, лишається «до»). Обидві опційні — сумісно з наявними.

alter table tasks add column start_date date;

-- Якщо задані обидві — початок не пізніше за дедлайн.
alter table tasks add constraint task_date_range
  check (start_date is null or due_date is null or start_date <= due_date);
