import { minutesToLabel } from "@/lib/time";
import { gridHeight, minuteToY } from "./geometry";

interface TimeAxisProps {
  dayStart: number;
  dayEnd: number;
}

export function TimeAxis({ dayStart, dayEnd }: TimeAxisProps) {
  const height = gridHeight(dayStart, dayEnd);
  const hours: number[] = [];
  const firstHour = Math.ceil(dayStart / 60) * 60;
  for (let m = firstHour; m <= dayEnd; m += 60) hours.push(m);

  return (
    <div className="relative w-12 shrink-0" style={{ height }}>
      {hours.map((m) => (
        <span
          key={m}
          className="absolute right-1 -translate-y-1/2 text-xs text-muted-foreground"
          style={{ top: minuteToY(m, dayStart) }}
        >
          {minutesToLabel(m)}
        </span>
      ))}
    </div>
  );
}
