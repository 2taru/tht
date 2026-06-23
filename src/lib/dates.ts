import { addDays, format, parseISO, startOfWeek } from "date-fns";

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Date → локальний ISO 'YYYY-MM-DD' (без TZ). */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, amount: number): string {
  return toISODate(addDays(parseISO(iso), amount));
}

/** Понеділок (або інший weekStart) тижня, що містить дату. */
export function weekStartISO(iso: string, weekStart: WeekStart): string {
  return toISODate(startOfWeek(parseISO(iso), { weekStartsOn: weekStart }));
}

/** Масив 7 ISO-дат тижня від weekStart. */
export function weekDaysISO(iso: string, weekStart: WeekStart): string[] {
  const base = startOfWeek(parseISO(iso), { weekStartsOn: weekStart });
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(base, i)));
}
