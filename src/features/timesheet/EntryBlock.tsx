import type { Project, TimeEntry } from "@/types/domain";
import { formatHours, minutesToLabel } from "@/lib/time";
import { minuteToY, PX_PER_MIN } from "./geometry";
import { cn } from "@/lib/utils";

interface EntryBlockProps {
  entry: TimeEntry;
  project: Project | undefined;
  dayStart: number;
  onClick: (entry: TimeEntry) => void;
}

export function EntryBlock({ entry, project, dayStart, onClick }: EntryBlockProps) {
  const top = minuteToY(entry.startMinute, dayStart);
  const height = (entry.endMinute - entry.startMinute) * PX_PER_MIN;
  const color = project?.color ?? "#64748b";
  const compact = height < 34;

  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      // зупиняємо drag-create контейнера при кліку по блоку
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs text-white shadow-sm transition hover:brightness-110",
      )}
      style={{
        top,
        height,
        backgroundColor: color,
        borderColor: "rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center justify-between gap-1 font-medium">
        <span className="truncate">{project?.name ?? "—"}</span>
        <span className="shrink-0 opacity-90">
          {formatHours(entry.endMinute - entry.startMinute)}
        </span>
      </div>
      {!compact && (
        <div className="truncate opacity-90">
          {entry.description || `${minutesToLabel(entry.startMinute)}–${minutesToLabel(entry.endMinute)}`}
        </div>
      )}
    </button>
  );
}
