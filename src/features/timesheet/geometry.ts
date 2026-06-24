/** Базова щільність: пікселів на хвилину по вертикалі (крок 10 хв → 14px). */
export const DEFAULT_PX_PER_MIN = 1.4;
/** Нижня межа щільності — нижче вмикається вертикальний скрол. */
export const MIN_PX_PER_MIN = 0.8;
/** Верхня межа авто-фіту — щоб на великих екранах слоти не роздувались. */
export const MAX_PX_PER_MIN = 2.2;
/** Стеля щільності при ручному зумі (вище за авто-фіт — вмикає вертикальний скрол). */
export const MAX_ZOOM_PX_PER_MIN = 6;
/** Межі та крок множника ручного зуму таймшиту (по вертикалі). */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;
export const ZOOM_FACTOR = 1.3;

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
