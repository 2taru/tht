/**
 * Планова норма робочого часу за період: рахуємо робочі дні у діапазоні
 * (за днями тижня з налаштувань) і множимо на тривалість робочого дня.
 * Дати — локальні ISO 'YYYY-MM-DD' (обидві межі включно).
 */
import { eachDayOfInterval, getDay } from "date-fns";
import { fromISODate } from "./dates";

/** Кількість робочих днів у [fromISO, toISO] за списком днів тижня (0=нд…6=сб). */
export function workDaysInRange(
  fromISO: string,
  toISO: string,
  workDays: number[],
): number {
  const from = fromISODate(fromISO);
  const to = fromISODate(toISO);
  if (from > to) return 0;
  const set = new Set(workDays);
  return eachDayOfInterval({ start: from, end: to }).reduce(
    (count, d) => (set.has(getDay(d)) ? count + 1 : count),
    0,
  );
}

/** Планова норма у хвилинах за період. */
export function plannedMinutes(
  fromISO: string,
  toISO: string,
  workDays: number[],
  workDayMinutes: number,
): number {
  return workDaysInRange(fromISO, toISO, workDays) * workDayMinutes;
}
