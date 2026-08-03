import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { m } from "motion/react";
import {
  ArrowUpDown,
  GripVertical,
  Move,
  MousePointerClick,
} from "lucide-react";
import type { Project, TimeEntry } from "@/types/domain";
import {
  clampMinute,
  formatHours,
  minutesToLabel,
  snapToStep,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_PX_PER_MIN, minuteToY } from "./geometry";
import { useLongPress } from "./useLongPress";

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
  const { t } = useTranslation();
  const [zone, setZone] = useState<Zone>(null);
  const [offset, setOffset] = useState(0); // вертикальний зсув у хвилинах під час перенесення
  const [offsetX, setOffsetX] = useState(0); // горизонтальний зсув у px (інший день)
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const draggedRef = useRef(false); // придушити click після drag/resize у цій же взаємодії

  // Touch: тап = редагування, long-press = перенесення; свайп по блоку скролить
  // сітку. Ресайз на touch не підтримуємо (час змінюється в діалозі).
  const rootRef = useRef<HTMLDivElement>(null);
  const lp = useLongPress(rootRef);

  const GAP = 3; // вертикальний проміжок між сусідніми записами
  const top =
    minuteToY(entry.startMinute, dayStart, pxPerMin) + offset * pxPerMin;
  const rawHeight = (entry.endMinute - entry.startMinute) * pxPerMin;
  const heightPx = Math.max(rawHeight - GAP, 6);
  const color = project?.color ?? "#64748b";

  const desc = entry.description?.trim() ?? "";
  const hasDesc = desc.length > 0;
  const timeRange = `${minutesToLabel(entry.startMinute)}–${minutesToLabel(entry.endMinute)}`;
  const hoursLabel = formatHours(entry.endMinute - entry.startMinute);
  // Малий слот із описом: ховаємо назву проєкту (колір і так її кодує), щоб
  // звільнити рядок під опис. Проєкт лишається, якщо опису нема або є висота.
  const showProject = !hasDesc || heightPx >= 44;
  // Другий рядок: опис (завжди, коли є) або часовий діапазон (лише за наявності місця).
  const showSecondLine = showProject && (hasDesc || heightPx >= 32);

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
    if (e.pointerType === "touch") {
      const { clientX, clientY, pointerId } = e;
      lp.begin(e, () => {
        draggedRef.current = true; // long-press = drag, не клік
        rootRef.current?.setPointerCapture(pointerId);
        startYRef.current = clientY;
        startXRef.current = clientX;
        movingRef.current = true;
        setMoving(true);
        setOffset(0);
        setOffsetX(0);
      });
      return;
    }
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
    if (lp.handleMoveWhileWaiting(e)) return;
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
    if (e.pointerType !== "touch") setZone(computeZone(e));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (lp.endAsTap()) {
      // Touch-тап до спрацювання long-press → редагування запису.
      draggedRef.current = true; // придушити наступний синтетичний click
      onClick(entry);
      return;
    }
    lp.setActive(false);
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

  function handlePointerCancel() {
    lp.reset();
    if (movingRef.current) {
      movingRef.current = false;
      setMoving(false);
      setOffset(0);
      setOffsetX(0);
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

  const block = (
    <m.div
      ref={rootRef}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onPointerDown={readOnly ? undefined : handlePointerDown}
      onPointerMove={readOnly ? undefined : handlePointerMove}
      onPointerUp={readOnly ? undefined : handlePointerUp}
      onPointerCancel={readOnly ? undefined : handlePointerCancel}
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
      <div className="flex items-start justify-between gap-1 font-medium">
        <span
          className={cn("min-w-0", showProject ? "truncate" : "break-words")}
        >
          {showProject ? (project?.name ?? "—") : desc}
        </span>
        <span className="shrink-0 opacity-90">{hoursLabel}</span>
      </div>
      {showSecondLine && (
        <div className="break-words opacity-90">{desc || timeRange}</div>
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

  // Тултип — лише в інтерактивному режимі; у readOnly показуємо чистий блок.
  if (readOnly) return block;

  return (
    <TooltipProvider delayDuration={450} disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>{block}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="max-w-72 space-y-2 px-3 py-2 text-left"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 break-words">
                {project?.name ?? "—"}
              </span>
            </div>
            <div className="opacity-70">
              {timeRange} · {hoursLabel} {t("timesheet.hoursShort")}
            </div>
            {hasDesc && <div className="break-words">{desc}</div>}
          </div>
          <div className="space-y-1.5 border-t border-current/15 pt-2 text-[11px] leading-snug opacity-75">
            <p className="mb-0.5 font-medium tracking-wide uppercase opacity-80">
              {t("timesheet.controls")}
            </p>
            <p className="flex items-start gap-1.5">
              <Move className="mt-px size-3 shrink-0" />
              <span>{t("timesheet.hintMove")}</span>
            </p>
            <p className="flex items-start gap-1.5">
              <ArrowUpDown className="mt-px size-3 shrink-0" />
              <span>{t("timesheet.hintResize")}</span>
            </p>
            <p className="flex items-start gap-1.5">
              <MousePointerClick className="mt-px size-3 shrink-0" />
              <span>{t("timesheet.hintEdit")}</span>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
