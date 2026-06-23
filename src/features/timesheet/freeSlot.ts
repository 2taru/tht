import type { TimeEntry } from "@/types/domain";

/**
 * Шукає найближчий вільний інтервал тривалості `duration` у межах [dayStart, dayEnd].
 * Спершу пробує `preferredStart`, далі скан проміжків зліва направо.
 * Повертає start вільного слоту або null, якщо місця немає.
 */
export function findFreeSlot(
  entries: TimeEntry[],
  dayStart: number,
  dayEnd: number,
  duration: number,
  preferredStart: number,
): number | null {
  const sorted = [...entries].sort((a, b) => a.startMinute - b.startMinute);

  const fits = (start: number) =>
    start >= dayStart &&
    start + duration <= dayEnd &&
    !sorted.some(
      (e) => start < e.endMinute && e.startMinute < start + duration,
    );

  if (fits(preferredStart)) return preferredStart;

  let cursor = dayStart;
  for (const e of sorted) {
    if (e.startMinute - cursor >= duration && fits(cursor)) return cursor;
    cursor = Math.max(cursor, e.endMinute);
  }
  if (dayEnd - cursor >= duration) return cursor;
  return null;
}
