/**
 * Час = хвилини від півночі (int) — джерело істини. Години показуємо десятковими.
 * Уся арифметика часу доби — лише тут; жодних `new Date()`-маніпуляцій у компонентах.
 */

/** "9:30" із хвилин від півночі (для підписів сітки). */
export function minutesToLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/** "09:30" — значення для <input type="time">. */
export function minutesToTimeValue(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** "09:30" → хвилини від півночі. */
export function timeValueToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Хвилини → години десятковими (90 → 1.5). */
export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/** Форматує тривалість у годинах десятковими, без зайвих нулів (6.5, 4, 0.5). */
export function formatHours(minutes: number, locale = "uk"): string {
  const hours = minutesToHours(minutes);
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(hours);
}

/** Округлення хвилин до кроку сітки (снап). */
export function snapToStep(minute: number, step: number): number {
  return Math.round(minute / step) * step;
}

/** Тривалість інтервалу у хвилинах. */
export function durationMinutes(startMinute: number, endMinute: number): number {
  return endMinute - startMinute;
}

/** Чи перетинаються два інтервали [aStart, aEnd) і [bStart, bEnd). */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Затиснути хвилину в межі [min, max]. */
export function clampMinute(minute: number, min: number, max: number): number {
  return Math.min(Math.max(minute, min), max);
}
