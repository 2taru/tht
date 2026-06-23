import { m } from "motion/react";
import type { Project, TimeEntry } from "@/types/domain";
import { formatHours, minutesToLabel } from "@/lib/time";
import { minuteToY, PX_PER_MIN } from "./geometry";

export type ResizeEdge = "top" | "bottom";

interface EntryBlockProps {
  entry: TimeEntry;
  project: Project | undefined;
  dayStart: number;
  onClick: (entry: TimeEntry) => void;
  onResizeStart: (edge: ResizeEdge, e: React.PointerEvent) => void;
}

export function EntryBlock({
  entry,
  project,
  dayStart,
  onClick,
  onResizeStart,
}: EntryBlockProps) {
  const top = minuteToY(entry.startMinute, dayStart);
  const height = (entry.endMinute - entry.startMinute) * PX_PER_MIN;
  const color = project?.color ?? "#64748b";
  const compact = height < 34;

  function handleResize(edge: ResizeEdge) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizeStart(edge, e);
    };
  }

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="group absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 text-xs text-white shadow-sm"
      style={{ top, height, backgroundColor: color, borderColor: "rgba(0,0,0,0.25)" }}
    >
      <div
        className="absolute inset-x-0 top-0 z-20 h-1.5 cursor-ns-resize bg-black/20 opacity-0 group-hover:opacity-100"
        onPointerDown={handleResize("top")}
      />
      <button
        type="button"
        onClick={() => onClick(entry)}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-10 px-2 py-1 text-left hover:brightness-110"
      >
        <div className="flex items-center justify-between gap-1 font-medium">
          <span className="truncate">{project?.name ?? "—"}</span>
          <span className="shrink-0 opacity-90">
            {formatHours(entry.endMinute - entry.startMinute)}
          </span>
        </div>
        {!compact && (
          <div className="truncate opacity-90">
            {entry.description ||
              `${minutesToLabel(entry.startMinute)}–${minutesToLabel(entry.endMinute)}`}
          </div>
        )}
      </button>
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-ns-resize bg-black/20 opacity-0 group-hover:opacity-100"
        onPointerDown={handleResize("bottom")}
      />
    </m.div>
  );
}
