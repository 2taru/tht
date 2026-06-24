import { minutesToLabel } from "@/lib/time";
import { DEFAULT_PX_PER_MIN, gridHeight, minuteToY } from "./geometry";

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
      {hours.map((m) => (
        <span
          key={m}
          className="absolute right-1 -translate-y-1/2 text-xs text-muted-foreground"
          style={{ top: minuteToY(m, dayStart, pxPerMin) }}
        >
          {minutesToLabel(m)}
        </span>
      ))}
    </div>
  );
}
