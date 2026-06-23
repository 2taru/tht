import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Project, TimeEntry } from "@/types/domain";
import {
  clampMinute,
  intervalsOverlap,
  snapToStep,
} from "@/lib/time";
import { gridHeight, minuteToY, PX_PER_MIN, yToMinute } from "./geometry";
import { EntryBlock } from "./EntryBlock";
import type { EntryDraft } from "./EntryDialog";
import { cn } from "@/lib/utils";

interface DaySettings {
  dayStartMinute: number;
  dayEndMinute: number;
  gridStepMinutes: number;
}

interface DayColumnProps {
  dateISO: string;
  entries: TimeEntry[];
  projectsById: Map<string, Project>;
  settings: DaySettings;
  onCreate: (draft: EntryDraft) => void;
  onEdit: (entry: TimeEntry) => void;
}

interface DragState {
  startMinute: number;
  currentMinute: number;
}

export function DayColumn({
  dateISO,
  entries,
  projectsById,
  settings,
  onCreate,
  onEdit,
}: DayColumnProps) {
  const { t } = useTranslation();
  const { dayStartMinute: dayStart, dayEndMinute: dayEnd, gridStepMinutes: step } =
    settings;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const height = gridHeight(dayStart, dayEnd);

  function minuteAtPointer(clientY: number): number {
    const rect = ref.current!.getBoundingClientRect();
    const raw = yToMinute(clientY - rect.top, dayStart);
    return clampMinute(snapToStep(raw, step), dayStart, dayEnd);
  }

  function overlapsExisting(a: number, b: number): boolean {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return entries.some((e) =>
      intervalsOverlap(lo, hi, e.startMinute, e.endMinute),
    );
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const m = minuteAtPointer(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startMinute: m, currentMinute: m });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag({ ...drag, currentMinute: minuteAtPointer(e.clientY) });
  }

  function handlePointerUp() {
    if (!drag) return;
    const lo = Math.min(drag.startMinute, drag.currentMinute);
    const hi = Math.max(drag.startMinute, drag.currentMinute);
    setDrag(null);
    if (hi - lo < step) return; // надто короткий — ігноруємо
    if (overlapsExisting(lo, hi)) {
      toast.error(t("errors.overlap"));
      return;
    }
    onCreate({ entryDate: dateISO, startMinute: lo, endMinute: hi });
  }

  // Лінії сітки кожен крок; жирніші — на межі години.
  const lines: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += step) lines.push(m);

  const previewLo = drag ? Math.min(drag.startMinute, drag.currentMinute) : 0;
  const previewHi = drag ? Math.max(drag.startMinute, drag.currentMinute) : 0;
  const previewOverlap = drag && overlapsExisting(previewLo, previewHi);

  return (
    <div
      ref={ref}
      className="relative w-full touch-none select-none"
      style={{ height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {lines.map((m) => (
        <div
          key={m}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t",
            m % 60 === 0 ? "border-border" : "border-border/40",
          )}
          style={{ top: minuteToY(m, dayStart) }}
        />
      ))}

      {entries.map((entry) => (
        <EntryBlock
          key={entry.id}
          entry={entry}
          project={projectsById.get(entry.projectId)}
          dayStart={dayStart}
          onClick={onEdit}
        />
      ))}

      {drag && previewHi - previewLo >= step && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 border-dashed",
            previewOverlap
              ? "border-destructive bg-destructive/20"
              : "border-primary bg-primary/15",
          )}
          style={{
            top: minuteToY(previewLo, dayStart),
            height: (previewHi - previewLo) * PX_PER_MIN,
          }}
        />
      )}
    </div>
  );
}
