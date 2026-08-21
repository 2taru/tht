/**
 * Планова норма робочого часу за період: рахуємо робочі дні у діапазоні
 * (за днями тижня з налаштувань) і множимо на тривалість робочого дня.
 * Дати — локальні ISO 'YYYY-MM-DD' (обидві межі включно).
 */
import { eachDayOfInterval, getDay } from "date-fns";
import { fromISODate, toISODate } from "./dates";

/**
 * Кількість робочих днів у [fromISO, toISO] за списком днів тижня (0=нд…6=сб).
 * `daysOff` — опційний набір ISO-дат (персональні вихідні: свята/відпустка),
 * які не рахуються навіть якщо припадають на робочий день тижня.
 */
export function workDaysInRange(
  fromISO: string,
  toISO: string,
  workDays: number[],
  daysOff?: Iterable<string>,
): number {
  const from = fromISODate(fromISO);
  const to = fromISODate(toISO);
  if (from > to) return 0;
  const set = new Set(workDays);
  const off = new Set(daysOff ?? []);
  return eachDayOfInterval({ start: from, end: to }).reduce(
    (count, d) =>
      set.has(getDay(d)) && !off.has(toISODate(d)) ? count + 1 : count,
    0,
  );
}

/** Планова норма у хвилинах за період (з урахуванням персональних вихідних). */
export function plannedMinutes(
  fromISO: string,
  toISO: string,
  workDays: number[],
  workDayMinutes: number,
  daysOff?: Iterable<string>,
): number {
  return workDaysInRange(fromISO, toISO, workDays, daysOff) * workDayMinutes;
}
