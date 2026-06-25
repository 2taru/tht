import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CopyPlus,
  Plus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import type { Project, TimeEntry } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useSettings } from "@/queries/settings";
import { useProjects } from "@/queries/projects";
import { useTasks } from "@/queries/tasks";
import {
  entriesKey,
  OVERLAP_VIOLATION,
  useBulkCreateEntries,
  useCreateEntry,
  useEntriesRange,
  useUpdateEntry,
} from "@/queries/timeEntries";
import { findFreeSlot } from "./freeSlot";
import {
  addDaysISO,
  fromISODate,
  todayISO,
  weekDaysISO,
  type WeekStart,
} from "@/lib/dates";
import { formatHours, intervalsOverlap } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { TimeAxis } from "./TimeAxis";
import { DayColumn } from "./DayColumn";
import { EntryDialog, type EntryDraft } from "./EntryDialog";
import {
  DEFAULT_PX_PER_MIN,
  MAX_PX_PER_MIN,
  MAX_ZOOM_PX_PER_MIN,
  MIN_PX_PER_MIN,
  ZOOM_FACTOR,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./geometry";

const DEFAULTS = {
  dayStartMinute: 540,
  dayEndMinute: 1140,
  gridStepMinutes: 30,
  weekStart: 1 as WeekStart,
};

type View = "week" | "day";

export function TimesheetPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;

  const { data: settings } = useSettings(userId);
  const cfg = settings ?? DEFAULTS;
  const weekStart = (settings?.weekStart ?? DEFAULTS.weekStart) as WeekStart;

  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) ?? "week";
  const date = params.get("date") ?? todayISO();

  const days = useMemo(
    () => (view === "week" ? weekDaysISO(date, weekStart) : [date]),
    [view, date, weekStart],
  );
  const fromISO = days[0];
  const toISO = days[days.length - 1];

  const { data: entries, isLoading } = useEntriesRange(
    workspaceId,
    userId,
    fromISO,
    toISO,
  );
  const { data: projects } = useProjects(workspaceId);
  const { data: tasks } = useTasks(workspaceId);

  const queryKey = entriesKey(workspaceId, userId, fromISO, toISO);
  const mutationCtx = { workspaceId, userId, queryKey };
  const createEntry = useCreateEntry(mutationCtx);
  const updateEntry = useUpdateEntry(mutationCtx);
  const bulkCreate = useBulkCreateEntries(mutationCtx);

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>();
    (projects ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    days.forEach((d) => map.set(d, []));
    (entries ?? []).forEach((e) => {
      map.get(e.entryDate)?.push(e);
    });
    return map;
  }, [entries, days]);

  // Межі сітки розширюємо, якщо є записи поза робочим днем (edge-case з PLAN).
  const { gridStart, gridEnd } = useMemo(() => {
    let start = cfg.dayStartMinute;
    let end = cfg.dayEndMinute;
    (entries ?? []).forEach((e) => {
      start = Math.min(start, e.startMinute);
      end = Math.max(end, e.endMinute);
    });
    return { gridStart: start, gridEnd: end };
  }, [entries, cfg.dayStartMinute, cfg.dayEndMinute]);

  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [moveReq, setMoveReq] = useState<{
    entry: TimeEntry;
    targetDay: string;
    newStart: number;
    newEnd: number;
  } | null>(null);

  // Геометрія колонок днів — щоб на дропі визначити цільовий день за X-координатою.
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  function dayAtX(clientX: number): string | null {
    for (const [day, el] of columnRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return day;
    }
    return null;
  }

  // Fit-to-height: масштабуємо сітку під доступну висоту, щоб день було видно без скролу.
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(0);
  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvailableHeight(el.clientHeight));
    ro.observe(el);
    setAvailableHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [isLoading]);

  // Ручний зум по вертикалі (множник поверх авто-фіту) — для малих екранів.
  const [zoom, setZoom] = useState(() => {
    const v = Number(localStorage.getItem("tht.timesheetZoom"));
    return v >= ZOOM_MIN && v <= ZOOM_MAX ? v : 1;
  });
  function changeZoom(next: number) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setZoom(z);
    localStorage.setItem("tht.timesheetZoom", String(z));
  }

  const gridSpanMinutes = gridEnd - gridStart;
  const pxPerMin = useMemo(() => {
    const clampZoom = (v: number) =>
      Math.min(MAX_ZOOM_PX_PER_MIN, Math.max(MIN_PX_PER_MIN, v * zoom));
    if (!availableHeight || gridSpanMinutes <= 0)
      return clampZoom(DEFAULT_PX_PER_MIN);
    const HEADER_PX = 40; // рядок із датами
    const FOOTER_PX = 29; // підсумок дня
    const fit = (availableHeight - HEADER_PX - FOOTER_PX) / gridSpanMinutes;
    // База — авто-фіт під висоту; зум множить її (зум > 1 → вертикальний скрол).
    const base = Math.min(MAX_PX_PER_MIN, Math.max(MIN_PX_PER_MIN, fit));
    return clampZoom(base);
  }, [availableHeight, gridSpanMinutes, zoom]);

  function requestMove(
    entry: TimeEntry,
    newStart: number,
    newEnd: number,
    clientX: number,
  ) {
    const targetDay = dayAtX(clientX) ?? entry.entryDate;
    // нічого не змінилось — ні час, ні день
    if (targetDay === entry.entryDate && newStart === entry.startMinute) return;
    const dayEntries = entriesByDay.get(targetDay) ?? [];
    const overlaps = dayEntries.some(
      (e) =>
        e.id !== entry.id &&
        intervalsOverlap(newStart, newEnd, e.startMinute, e.endMinute),
    );
    if (overlaps) {
      toast.error(t("errors.overlap"));
      return;
    }
    setMoveReq({ entry, targetDay, newStart, newEnd });
  }

  async function applyMove(mode: "move" | "duplicate") {
    if (!moveReq) return;
    const { entry, targetDay, newStart, newEnd } = moveReq;
    setMoveReq(null);
    try {
      if (mode === "move") {
        await updateEntry.mutateAsync({
          id: entry.id,
          entryDate: targetDay,
          startMinute: newStart,
          endMinute: newEnd,
        });
      } else {
        await createEntry.mutateAsync({
          projectId: entry.projectId,
          taskId: entry.taskId ?? null,
          entryDate: targetDay,
          startMinute: newStart,
          endMinute: newEnd,
          description: entry.description ?? null,
        });
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(
        code === OVERLAP_VIOLATION ? t("errors.overlap") : t("common.error"),
      );
    }
  }

  function openCreate(d: EntryDraft) {
    setDraft(d);
    setDialogOpen(true);
  }
  // Швидке додавання (мобільний): найближчий вільний 30-хв слот видимого дня.
  function quickAdd() {
    const today = todayISO();
    const targetDay =
      view === "day" ? date : days.includes(today) ? today : fromISO;
    const dayEntries = entriesByDay.get(targetDay) ?? [];
    const slot = findFreeSlot(dayEntries, gridStart, gridEnd, 30, gridStart);
    if (slot === null) {
      toast.error(t("timesheet.noFreeSlot"));
      return;
    }
    openCreate({
      entryDate: targetDay,
      startMinute: slot,
      endMinute: slot + 30,
    });
  }

  function openEdit(entry: TimeEntry) {
    setDraft({
      id: entry.id,
      entryDate: entry.entryDate,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      projectId: entry.projectId,
      taskId: entry.taskId,
      description: entry.description,
    });
    setDialogOpen(true);
  }

  function setView(next: View) {
    const p = new URLSearchParams(params);
    p.set("view", next);
    p.set("date", date);
    setParams(p, { replace: true });
  }
  function navigate(direction: -1 | 1) {
    const stepDays = view === "week" ? 7 : 1;
    const p = new URLSearchParams(params);
    p.set("date", addDaysISO(date, direction * stepDays));
    setParams(p, { replace: true });
  }
  function goToday() {
    const p = new URLSearchParams(params);
    p.set("date", todayISO());
    setParams(p, { replace: true });
  }

  const periodLabel =
    view === "week"
      ? `${format(fromISODate(fromISO), "d MMM", { locale: uk })} – ${format(fromISODate(toISO), "d MMM", { locale: uk })}`
      : format(fromISODate(date), "EEEE, d MMMM", { locale: uk });

  const totalMinutes = (entries ?? []).reduce(
    (sum, e) => sum + (e.endMinute - e.startMinute),
    0,
  );

  const perProject = useMemo(() => {
    const acc = new Map<string, number>();
    (entries ?? []).forEach((e) => {
      acc.set(
        e.projectId,
        (acc.get(e.projectId) ?? 0) + (e.endMinute - e.startMinute),
      );
    });
    return [...acc.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  async function handleDuplicate(d: EntryDraft) {
    if (!d.projectId) return;
    const dayEntries = entriesByDay.get(d.entryDate) ?? [];
    const duration = d.endMinute - d.startMinute;
    const slot = findFreeSlot(
      dayEntries,
      gridStart,
      gridEnd,
      duration,
      d.endMinute,
    );
    if (slot === null) {
      toast.error(t("timesheet.noFreeSlot"));
      return;
    }
    try {
      await createEntry.mutateAsync({
        projectId: d.projectId,
        taskId: d.taskId ?? null,
        entryDate: d.entryDate,
        startMinute: slot,
        endMinute: slot + duration,
        description: d.description ?? null,
      });
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleCopyPeriod() {
    const src = entries ?? [];
    if (src.length === 0) {
      toast.error(t("timesheet.copyEmpty"));
      return;
    }
    const offset = view === "week" ? 7 : 1;
    const rows = src.map((e) => ({
      projectId: e.projectId,
      taskId: e.taskId,
      entryDate: addDaysISO(e.entryDate, offset),
      startMinute: e.startMinute,
      endMinute: e.endMinute,
      description: e.description,
    }));
    try {
      const res = await bulkCreate.mutateAsync(rows);
      toast.success(
        t("timesheet.copied", { created: res.created, skipped: res.skipped }),
      );
      navigate(1);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={t("timesheet.prevPeriod")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            aria-label={t("timesheet.nextPeriod")}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            {t("common.today")}
          </Button>
          <span className="ml-2 font-medium capitalize">{periodLabel}</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>
              {t("timesheet.total")}:{" "}
              <span className="font-semibold text-foreground">
                {formatHours(totalMinutes)} {t("common.hours")}
              </span>
            </span>
            {perProject.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                onClick={() => setShowBreakdown((v) => !v)}
                aria-expanded={showBreakdown}
              >
                {showBreakdown ? t("timesheet.less") : t("timesheet.more")}
                {showBreakdown ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-r-none"
              onClick={() => changeZoom(zoom / ZOOM_FACTOR)}
              disabled={zoom <= ZOOM_MIN + 0.001}
              aria-label={t("timesheet.zoomOut")}
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-l-none border-l"
              onClick={() => changeZoom(zoom * ZOOM_FACTOR)}
              disabled={zoom >= ZOOM_MAX - 0.001}
              aria-label={t("timesheet.zoomIn")}
            >
              <ZoomIn className="size-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleCopyPeriod}
            aria-label={
              view === "week" ? t("timesheet.copyWeek") : t("timesheet.copyDay")
            }
            title={
              view === "week" ? t("timesheet.copyWeek") : t("timesheet.copyDay")
            }
            className="max-sm:size-9 max-sm:p-0"
          >
            <CopyPlus className="size-4" />
            <span className="max-sm:hidden">
              {view === "week"
                ? t("timesheet.copyWeek")
                : t("timesheet.copyDay")}
            </span>
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="week">{t("timesheet.week")}</TabsTrigger>
              <TabsTrigger value="day">{t("timesheet.day")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showBreakdown && perProject.length > 0 && (
          <m.div
            key="breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-0.5">
              {perProject.map(([pid, minutes]) => {
                const p = projectsById.get(pid);
                return (
                  <Badge
                    key={pid}
                    variant="outline"
                    className="gap-1.5"
                    style={{ borderColor: p?.color }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: p?.color ?? "#64748b" }}
                    />
                    {p?.name ?? "—"}: {formatHours(minutes)}
                  </Badge>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {!isLoading &&
        (projects ?? []).filter((p) => !p.isArchived).length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t("timesheet.onboarding")}{" "}
            <Link to="/projects" className="text-foreground underline">
              {t("timesheet.goToProjects")}
            </Link>
          </div>
        )}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div
          ref={gridScrollRef}
          className="min-h-0 flex-1 overflow-auto rounded-lg border"
        >
          <div className="flex">
            <div className="sticky left-0 z-10 bg-background">
              <div className="h-10" />
              <TimeAxis
                dayStart={gridStart}
                dayEnd={gridEnd}
                pxPerMin={pxPerMin}
              />
            </div>
            {days.map((d) => {
              const dayEntries = entriesByDay.get(d) ?? [];
              const dayMinutes = dayEntries.reduce(
                (s, e) => s + (e.endMinute - e.startMinute),
                0,
              );
              const isToday = d === todayISO();
              return (
                <div
                  key={d}
                  ref={(el) => {
                    if (el) columnRefs.current.set(d, el);
                    else columnRefs.current.delete(d);
                  }}
                  className="flex min-w-28 flex-1 flex-col border-l"
                >
                  <div
                    className={`flex h-10 flex-col items-center justify-center text-xs ${isToday ? "bg-accent font-semibold" : ""}`}
                  >
                    <span className="capitalize text-muted-foreground">
                      {format(fromISODate(d), "EEE", { locale: uk })}
                    </span>
                    <span>{format(fromISODate(d), "d", { locale: uk })}</span>
                  </div>
                  <DayColumn
                    dateISO={d}
                    entries={dayEntries}
                    projectsById={projectsById}
                    settings={{
                      dayStartMinute: gridStart,
                      dayEndMinute: gridEnd,
                      gridStepMinutes: cfg.gridStepMinutes,
                    }}
                    pxPerMin={pxPerMin}
                    workspaceId={workspaceId}
                    userId={userId}
                    queryKey={queryKey}
                    onCreate={openCreate}
                    onEdit={openEdit}
                    onRequestMove={requestMove}
                  />
                  <div className="border-t py-1 text-center text-xs font-medium">
                    {dayMinutes > 0 ? formatHours(dayMinutes) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button
        onClick={quickAdd}
        className="fixed bottom-5 right-5 z-30 size-12 rounded-full shadow-lg lg:hidden"
        aria-label={t("timesheet.newEntry")}
      >
        <Plus className="size-5" />
      </Button>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        projects={projects ?? []}
        tasks={tasks ?? []}
        workspaceId={workspaceId}
        userId={userId}
        queryKey={queryKey}
        onDuplicate={handleDuplicate}
      />

      <Dialog
        open={moveReq !== null}
        onOpenChange={(o) => !o && setMoveReq(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("timesheet.moveTitle")}</DialogTitle>
            <DialogDescription>
              {t("timesheet.moveDesc")}
              {moveReq && moveReq.targetDay !== moveReq.entry.entryDate && (
                <span className="mt-1 block font-medium text-foreground capitalize">
                  →{" "}
                  {format(fromISODate(moveReq.targetDay), "EEEE, d MMMM", {
                    locale: uk,
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setMoveReq(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="outline" onClick={() => applyMove("duplicate")}>
              {t("timesheet.duplicate")}
            </Button>
            <Button onClick={() => applyMove("move")}>
              {t("timesheet.move")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
