import { minutesToLabel } from "@/lib/time";
import { DEFAULT_PX_PER_MIN, gridHeight, minuteToY } from "./geometry";

/**
 * Половина висоти рядка мітки (text-xs → line-height 16px). Мітки центруються
 * на лінії години, тож крайні треба підтиснути всередину осі — інакше верхню
 * половину першої мітки замальовує sticky-заглушка шапки днів.
 */
const LABEL_HALF_PX = 8;

interface TimeAxisProps {
  dayStart: number;
  dayEnd: number;
  pxPerMin?: number;
}

export function TimeAxis({
  dayStart,
  dayEnd,
  pxPerMin = DEFAULT_PX_PER_MIN,
}: TimeAxisProps) {
  const height = gridHeight(dayStart, dayEnd, pxPerMin);
  const hours: number[] = [];
  const firstHour = Math.ceil(dayStart / 60) * 60;
  for (let m = firstHour; m <= dayEnd; m += 60) hours.push(m);

  return (
    <div className="relative w-12 shrink-0" style={{ height }}>
      {hours.map((m) => {
        const y = minuteToY(m, dayStart, pxPerMin);
        const top = Math.min(
          Math.max(y, LABEL_HALF_PX),
          Math.max(height - LABEL_HALF_PX, LABEL_HALF_PX),
        );
        return (
          <span
            key={m}
            className="absolute right-1 -translate-y-1/2 text-xs text-muted-foreground"
            style={{ top }}
          >
            {minutesToLabel(m)}
          </span>
        );
      })}
    </div>
  );
}
