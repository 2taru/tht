import { useRef, useState } from "react";
import { m } from "motion/react";
import { GripVertical } from "lucide-react";
import type { Project, TimeEntry } from "@/types/domain";
import {
  clampMinute,
  formatHours,
  minutesToLabel,
  snapToStep,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { DEFAULT_PX_PER_MIN, minuteToY } from "./geometry";

export type ResizeEdge = "top" | "bottom";

/** Зона під курсором: ліва — редагування, права — перенесення, краї середини — ресайз. */
type Zone = "edit" | "move" | "resizeTop" | "resizeBottom" | null;

/** Відстань від верх/низ краю (px), у межах якої в середній частині зʼявляється ресайз. */
const EDGE_PX = 10;

interface EntryBlockProps {
  entry: TimeEntry;
  project: Project | undefined;
  dayStart: number;
  dayEnd: number;
  step: number;
  pxPerMin?: number;
  readOnly?: boolean;
  onClick: (entry: TimeEntry) => void;
  onResizeStart: (edge: ResizeEdge, e: React.PointerEvent) => void;
  onMove: (
    entry: TimeEntry,
    newStartMinute: number,
    newEndMinute: number,
    clientX: number,
  ) => void;
}

export function EntryBlock({
  entry,
  project,
  dayStart,
  dayEnd,
  step,
  pxPerMin = DEFAULT_PX_PER_MIN,
  readOnly = false,
  onClick,
  onResizeStart,
  onMove,
}: EntryBlockProps) {
  const [zone, setZone] = useState<Zone>(null);
  const [offset, setOffset] = useState(0); // вертикальний зсув у хвилинах під час перенесення
  const [offsetX, setOffsetX] = useState(0); // горизонтальний зсув у px (інший день)
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const draggedRef = useRef(false); // придушити click після drag/resize у цій же взаємодії

  const GAP = 3; // вертикальний проміжок між сусідніми записами
  const top =
    minuteToY(entry.startMinute, dayStart, pxPerMin) + offset * pxPerMin;
  const rawHeight = (entry.endMinute - entry.startMinute) * pxPerMin;
  const heightPx = Math.max(rawHeight - GAP, 6);
  const color = project?.color ?? "#64748b";
  const compact = heightPx < 34;

  function computeZone(e: React.PointerEvent): Zone {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width: w, height: h } = rect;
    const col = x < w / 3 ? "left" : x > (2 * w) / 3 ? "right" : "middle";
    if (col === "middle" && (y <= EDGE_PX || y >= h - EDGE_PX)) {
      return y < h / 2 ? "resizeTop" : "resizeBottom";
    }
    if (col === "right") return "move";
    return "edit";
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation(); // не починаємо створення нового запису в колонці
    draggedRef.current = false;
    const z = computeZone(e);
    if (z === "resizeTop" || z === "resizeBottom") {
      draggedRef.current = true; // ресайз не має відкривати редагування
      onResizeStart(z === "resizeTop" ? "top" : "bottom", e);
      return;
    }
    if (z === "move") {
      e.currentTarget.setPointerCapture(e.pointerId);
      startYRef.current = e.clientY;
      startXRef.current = e.clientX;
      movingRef.current = true;
      setMoving(true);
      setOffset(0);
      setOffsetX(0);
      return;
    }
    // edit-зона: нічого не робимо — спрацює click
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (movingRef.current) {
      const deltaMin = snapToStep(
        (e.clientY - startYRef.current) / pxPerMin,
        step,
      );
      setOffset(
        clampMinute(
          deltaMin,
          dayStart - entry.startMinute,
          dayEnd - entry.endMinute,
        ),
      );
      setOffsetX(e.clientX - startXRef.current);
      return;
    }
    setZone(computeZone(e));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!movingRef.current) return;
    movingRef.current = false;
    setMoving(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    const d = offset;
    const dx = offsetX;
    setOffset(0);
    setOffsetX(0);
    // Рух або по вертикалі (час), або по горизонталі (інший день) → це drag.
    if (d !== 0 || Math.abs(dx) > 6) {
      draggedRef.current = true; // наступний click — артефакт drag
      onMove(entry, entry.startMinute + d, entry.endMinute + d, e.clientX);
    }
  }

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onClick(entry);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(entry);
    }
  }

  const cursor = readOnly
    ? "cursor-default"
    : moving
      ? "cursor-grabbing"
      : zone === "move"
        ? "cursor-grab"
        : zone === "resizeTop" || zone === "resizeBottom"
          ? "cursor-ns-resize"
          : "cursor-pointer";

  return (
    <m.div
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onPointerDown={readOnly ? undefined : handlePointerDown}
      onPointerMove={readOnly ? undefined : handlePointerMove}
      onPointerUp={readOnly ? undefined : handlePointerUp}
      onPointerLeave={
        readOnly ? undefined : () => !movingRef.current && setZone(null)
      }
      onClick={readOnly ? undefined : handleClick}
      onKeyDown={readOnly ? undefined : handleKeyDown}
      className={cn(
        "absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70",
        !readOnly && "hover:brightness-110",
        moving ? "z-30 opacity-90 shadow-lg ring-2 ring-white/70" : "z-10",
        cursor,
      )}
      style={{
        top,
        height: heightPx,
        x: moving ? offsetX : 0,
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
          {entry.description ||
            `${minutesToLabel(entry.startMinute)}–${minutesToLabel(entry.endMinute)}`}
        </div>
      )}

      {/* Грип-іконка перенесення (права зона): праворуч знизу, на малих слотах
          накладається на текст. */}
      {!readOnly && (
        <>
          <m.span
            aria-hidden
            className="pointer-events-none absolute bottom-1 right-1 z-10"
            initial={false}
            animate={{ opacity: zone === "move" || moving ? 0.95 : 0 }}
            transition={{ duration: 0.12 }}
          >
            <GripVertical className="size-4" />
          </m.span>

          <ResizeGrip edge="top" active={zone === "resizeTop"} />
          <ResizeGrip edge="bottom" active={zone === "resizeBottom"} />
        </>
      )}
    </m.div>
  );
}

interface ResizeGripProps {
  edge: ResizeEdge;
  active: boolean;
}

/** Лише візуальний грип-індикатор; хіт-детект — за зоною в EntryBlock. */
function ResizeGrip({ edge, active }: ResizeGripProps) {
  const isTop = edge === "top";
  return (
    <m.span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 mx-auto h-1 w-6 rounded-full bg-white/80 shadow-sm"
      style={isTop ? { top: 3 } : { bottom: 3 }}
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : isTop ? -3 : 3 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  );
}
