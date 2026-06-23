import { addDaysISO } from "./dates";

export type DueStatus = "overdue" | "today" | "soon" | "none";

/**
 * Класифікує дедлайн відносно сьогодні (ISO-дати порівнюються лексикографічно).
 * `soonDays` — горизонт «скоро» (за замовчуванням 3 дні).
 */
export function classifyDue(
  dueDate: string | null,
  todayISO: string,
  soonDays = 3,
): DueStatus {
  if (!dueDate) return "none";
  if (dueDate < todayISO) return "overdue";
  if (dueDate === todayISO) return "today";
  if (dueDate <= addDaysISO(todayISO, soonDays)) return "soon";
  return "none";
}

/** Чи це нагадування варте уваги (усе, крім none). */
export function isDueRelevant(status: DueStatus): boolean {
  return status !== "none";
}

/** Пріоритет сортування нагадувань (менше — терміновіше). */
export const dueOrder: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  none: 3,
};
