import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { m } from "motion/react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import type { QueryKey } from "@tanstack/react-query";
import type { Project, TimeEntry } from "@/types/domain";
import { clampMinute, intervalsOverlap, snapToStep, splitDuration } from "@/lib/time";
import {
  OVERLAP_VIOLATION,
  useUpdateEntry,
} from "@/queries/timeEntries";
import {
  DEFAULT_PX_PER_MIN,
  gridHeight,
  minuteToY,
  yToMinute,
} from "./geometry";
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
  pxPerMin?: number;
  workspaceId: string | null;
  userId: string | null;
  queryKey: QueryKey;
  onCreate: (draft: EntryDraft) => void;
  onEdit: (entry: TimeEntry) => void;
  onRequestMove: (
    entry: TimeEntry,
    newStartMinute: number,
    newEndMinute: number,
    clientX: number,
  ) => void;
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

interface PendingSelection {
  lo: number;
  hi: number;
}

interface PendingDrag {
  mode: "top" | "bottom" | "move";
  origLo: number;
  origHi: number;
  anchor: number;
}

export function DayColumn({
  dateISO,
  entries,
  projectsById,
  settings,
  pxPerMin = DEFAULT_PX_PER_MIN,
  workspaceId,
  userId,
  queryKey,
  onCreate,
  onEdit,
  onRequestMove,
}: DayColumnProps) {
  const { t } = useTranslation();
  const { dayStartMinute: dayStart, dayEndMinute: dayEnd, gridStepMinutes: step } =
    settings;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [pendingDrag, setPendingDrag] = useState<PendingDrag | null>(null);
  const update = useUpdateEntry({ workspaceId, userId, queryKey });

  const height = gridHeight(dayStart, dayEnd, pxPerMin);

  /** "2 год 15 хв" / "45 хв" — людиночитна тривалість виділення. */
  function durationLabel(minutes: number): string {
    const { hours, minutes: mins } = splitDuration(minutes);
    if (hours && mins) return t("timesheet.durationHM", { h: hours, m: mins });
    if (hours) return t("timesheet.durationH", { h: hours });
    return t("timesheet.durationM", { m: mins });
  }

  function minuteAtPointer(clientY: number): number {
    const rect = ref.current!.getBoundingClientRect();
    const raw = yToMinute(clientY - rect.top, dayStart, pxPerMin);
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
    if (e.button !== 0 || resize || pendingDrag) return;
    setPending(null); // нове виділення скасовує попереднє незбережене
    const m = minuteAtPointer(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startMinute: m, currentMinute: m });
  }

  /** Початок редагування виділення (ресайз краю або перенесення тіла). */
  function startPendingDrag(mode: PendingDrag["mode"], e: React.PointerEvent) {
    if (!pending) return;
    e.stopPropagation();
    ref.current?.setPointerCapture(e.pointerId);
    document.body.style.setProperty("cursor", mode === "move" ? "grabbing" : "ns-resize");
    setPendingDrag({
      mode,
      origLo: pending.lo,
      origHi: pending.hi,
      anchor: minuteAtPointer(e.clientY),
    });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const m = minuteAtPointer(e.clientY);
    if (pendingDrag && pending) {
      if (pendingDrag.mode === "top") {
        setPending({ lo: Math.min(m, pending.hi - step), hi: pending.hi });
      } else if (pendingDrag.mode === "bottom") {
        setPending({ lo: pending.lo, hi: Math.max(m, pending.lo + step) });
      } else {
        const dur = pendingDrag.origHi - pendingDrag.origLo;
        const lo = clampMinute(
          pendingDrag.origLo + (m - pendingDrag.anchor),
          dayStart,
          dayEnd - dur,
        );
        setPending({ lo, hi: lo + dur });
      }
      return;
    }
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

  /** Слот за замовчуванням під клік (без протягування): один крок сітки. */
  function defaultSlotAt(start: number): PendingSelection | null {
    let end = Math.min(start + step, dayEnd);
    for (const e of entries) {
      if (e.startMinute >= start && e.startMinute < end) end = e.startMinute;
    }
    if (end - start < step || overlapsExisting(start, end)) return null;
    return { lo: start, hi: end };
  }

  function handlePointerUp() {
    if (pendingDrag) {
      setPendingDrag(null);
      document.body.style.removeProperty("cursor");
      return;
    }
    if (resize) {
      void commitResize(resize);
      return;
    }
    if (!drag) return;
    const lo = Math.min(drag.startMinute, drag.currentMinute);
    const hi = Math.max(drag.startMinute, drag.currentMinute);
    setDrag(null);
    // Клік або надто короткий drag → слот за замовчуванням від точки кліку.
    if (hi - lo < step) {
      const slot = defaultSlotAt(lo);
      if (slot) setPending(slot);
      else toast.error(t("timesheet.noFreeSlot"));
      return;
    }
    if (overlapsExisting(lo, hi)) {
      toast.error(t("errors.overlap"));
      return;
    }
    setPending({ lo, hi }); // не відкриваємо діалог одразу — чекаємо «Зберегти»
  }

  function confirmPending(e: React.MouseEvent) {
    e.stopPropagation();
    if (!pending) return;
    if (overlapsExisting(pending.lo, pending.hi)) {
      toast.error(t("errors.overlap"));
      return;
    }
    onCreate({ entryDate: dateISO, startMinute: pending.lo, endMinute: pending.hi });
    setPending(null);
  }

  function cancelPending(e: React.MouseEvent) {
    e.stopPropagation();
    setPending(null);
  }

  // Цільовий день і перевірку перетину робить TimesheetPage (день може змінитись).
  function handleMove(
    entry: TimeEntry,
    newStart: number,
    newEnd: number,
    clientX: number,
  ) {
    onRequestMove(entry, newStart, newEnd, clientX);
  }

  const lines: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += step) lines.push(m);

  const previewLo = drag ? Math.min(drag.startMinute, drag.currentMinute) : 0;
  const previewHi = drag ? Math.max(drag.startMinute, drag.currentMinute) : 0;
  const previewOverlap = drag && overlapsExisting(previewLo, previewHi);
  const showPreview = drag && previewHi - previewLo >= step;
  const pendingOverlap = pending && overlapsExisting(pending.lo, pending.hi);
  // На низькому виділенні грип-пігулки накладались би на лейбл — ховаємо їх.
  const pendingTall = pending && (pending.hi - pending.lo) * pxPerMin >= 32;

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
          style={{ top: minuteToY(m, dayStart, pxPerMin) }}
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
            dayEnd={dayEnd}
            step={step}
            pxPerMin={pxPerMin}
            onClick={onEdit}
            onResizeStart={(edge, e) => startResize(entry, edge, e)}
            onMove={handleMove}
          />
        );
      })}

      {/* Живе прев'ю під час протягування */}
      {showPreview && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-1 z-20 flex items-center justify-center rounded-md border-2 border-dashed text-xs font-semibold",
            previewOverlap
              ? "border-destructive bg-destructive/20 text-destructive"
              : "border-primary bg-primary/15 text-primary",
          )}
          style={{
            top: minuteToY(previewLo, dayStart, pxPerMin),
            height: (previewHi - previewLo) * pxPerMin,
          }}
        >
          <span className="rounded-md bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
            {durationLabel(previewHi - previewLo)}
          </span>
        </div>
      )}

      {/* Відкладене виділення — редаговане (ресайз країв + перенесення тіла) */}
      {pending && (
        <>
          <m.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onPointerDown={(e) => startPendingDrag("move", e)}
            className={cn(
              "absolute inset-x-1 z-20 flex cursor-grab items-center justify-center rounded-md border-2 text-xs font-semibold",
              pendingDrag?.mode === "move" && "cursor-grabbing",
              pendingOverlap
                ? "border-destructive bg-destructive/20 text-destructive"
                : "border-primary bg-primary/15 text-primary",
            )}
            style={{
              top: minuteToY(pending.lo, dayStart, pxPerMin),
              height: (pending.hi - pending.lo) * pxPerMin,
            }}
          >
            <span className="pointer-events-none rounded-md bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
              {durationLabel(pending.hi - pending.lo)}
            </span>
            {/* Ручки ресайзу */}
            <div
              onPointerDown={(e) => startPendingDrag("top", e)}
              className="absolute inset-x-0 top-0 flex h-2.5 cursor-ns-resize items-center justify-center"
            >
              {pendingTall && <span className="h-1 w-6 rounded-full bg-primary/80" />}
            </div>
            <div
              onPointerDown={(e) => startPendingDrag("bottom", e)}
              className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-center justify-center"
            >
              {pendingTall && <span className="h-1 w-6 rounded-full bg-primary/80" />}
            </div>
          </m.div>
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 z-30 flex justify-center gap-1.5"
            style={{ top: minuteToY(pending.hi, dayStart, pxPerMin) + 4 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={confirmPending}
              aria-label={t("timesheet.saveSelection")}
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={cancelPending}
              aria-label={t("timesheet.cancelSelection")}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-md transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </m.div>
        </>
      )}
    </div>
  );
}
