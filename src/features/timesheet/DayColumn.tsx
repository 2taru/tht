import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { QueryKey } from "@tanstack/react-query";
import type { Project, TimeEntry } from "@/types/domain";
import { clampMinute, intervalsOverlap, snapToStep } from "@/lib/time";
import {
  OVERLAP_VIOLATION,
  useUpdateEntry,
} from "@/queries/timeEntries";
import { gridHeight, minuteToY, PX_PER_MIN, yToMinute } from "./geometry";
import { EntryBlock, type ResizeEdge } from "./EntryBlock";
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
  workspaceId: string | null;
  userId: string | null;
  queryKey: QueryKey;
  onCreate: (draft: EntryDraft) => void;
  onEdit: (entry: TimeEntry) => void;
}

interface DragState {
  startMinute: number;
  currentMinute: number;
}

interface ResizeState {
  id: string;
  edge: ResizeEdge;
  startMinute: number;
  endMinute: number;
}

export function DayColumn({
  dateISO,
  entries,
  projectsById,
  settings,
  workspaceId,
  userId,
  queryKey,
  onCreate,
  onEdit,
}: DayColumnProps) {
  const { t } = useTranslation();
  const { dayStartMinute: dayStart, dayEndMinute: dayEnd, gridStepMinutes: step } =
    settings;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const update = useUpdateEntry({ workspaceId, userId, queryKey });

  const height = gridHeight(dayStart, dayEnd);

  function minuteAtPointer(clientY: number): number {
    const rect = ref.current!.getBoundingClientRect();
    const raw = yToMinute(clientY - rect.top, dayStart);
    return clampMinute(snapToStep(raw, step), dayStart, dayEnd);
  }

  function overlapsExisting(a: number, b: number, ignoreId?: string): boolean {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return entries.some(
      (e) =>
        e.id !== ignoreId && intervalsOverlap(lo, hi, e.startMinute, e.endMinute),
    );
  }

  function startResize(entry: TimeEntry, edge: ResizeEdge, e: React.PointerEvent) {
    ref.current?.setPointerCapture(e.pointerId);
    document.body.style.setProperty("cursor", "ns-resize");
    setResize({
      id: entry.id,
      edge,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || resize) return;
    const m = minuteAtPointer(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startMinute: m, currentMinute: m });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const m = minuteAtPointer(e.clientY);
    if (resize) {
      if (resize.edge === "top") {
        setResize({ ...resize, startMinute: Math.min(m, resize.endMinute - step) });
      } else {
        setResize({ ...resize, endMinute: Math.max(m, resize.startMinute + step) });
      }
      return;
    }
    if (drag) setDrag({ ...drag, currentMinute: m });
  }

  async function commitResize(r: ResizeState) {
    setResize(null);
    document.body.style.removeProperty("cursor");
    const original = entries.find((e) => e.id === r.id);
    if (!original) return;
    if (r.startMinute === original.startMinute && r.endMinute === original.endMinute) {
      return;
    }
    if (overlapsExisting(r.startMinute, r.endMinute, r.id)) {
      toast.error(t("errors.overlap"));
      return;
    }
    try {
      await update.mutateAsync({
        id: r.id,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(code === OVERLAP_VIOLATION ? t("errors.overlap") : t("common.error"));
    }
  }

  function handlePointerUp() {
    if (resize) {
      void commitResize(resize);
      return;
    }
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

  const lines: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += step) lines.push(m);

  const previewLo = drag ? Math.min(drag.startMinute, drag.currentMinute) : 0;
  const previewHi = drag ? Math.max(drag.startMinute, drag.currentMinute) : 0;
  const previewOverlap = drag && overlapsExisting(previewLo, previewHi);

  return (
    <div
      ref={ref}
      className="relative w-full cursor-crosshair touch-none select-none"
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

      {entries.map((entry) => {
        const shown =
          resize && resize.id === entry.id
            ? { ...entry, startMinute: resize.startMinute, endMinute: resize.endMinute }
            : entry;
        return (
          <EntryBlock
            key={entry.id}
            entry={shown}
            project={projectsById.get(entry.projectId)}
            dayStart={dayStart}
            onClick={onEdit}
            onResizeStart={(edge, e) => startResize(entry, edge, e)}
          />
        );
      })}

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
