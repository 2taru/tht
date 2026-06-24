/** Базова щільність: пікселів на хвилину по вертикалі (крок 10 хв → 14px). */
export const DEFAULT_PX_PER_MIN = 1.4;
/** Нижня межа щільності — нижче вмикається вертикальний скрол. */
export const MIN_PX_PER_MIN = 0.8;
/** Верхня межа — щоб на великих екранах слоти не роздувались. */
export const MAX_PX_PER_MIN = 2.2;

export function minuteToY(
  minute: number,
  dayStart: number,
  pxPerMin = DEFAULT_PX_PER_MIN,
): number {
  return (minute - dayStart) * pxPerMin;
}

export function yToMinute(
  y: number,
  dayStart: number,
  pxPerMin = DEFAULT_PX_PER_MIN,
): number {
  return dayStart + y / pxPerMin;
}

export function gridHeight(
  dayStart: number,
  dayEnd: number,
  pxPerMin = DEFAULT_PX_PER_MIN,
): number {
  return (dayEnd - dayStart) * pxPerMin;
}
