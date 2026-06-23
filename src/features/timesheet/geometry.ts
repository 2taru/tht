/** Пікселів на хвилину по вертикалі. Крок 10 хв → 14px. */
export const PX_PER_MIN = 1.4;

export function minuteToY(minute: number, dayStart: number): number {
  return (minute - dayStart) * PX_PER_MIN;
}

export function yToMinute(y: number, dayStart: number): number {
  return dayStart + y / PX_PER_MIN;
}

export function gridHeight(dayStart: number, dayEnd: number): number {
  return (dayEnd - dayStart) * PX_PER_MIN;
}
