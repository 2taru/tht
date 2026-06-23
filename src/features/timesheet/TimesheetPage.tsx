import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import type { Project, TimeEntry } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useSettings } from "@/queries/settings";
import { useProjects } from "@/queries/projects";
import { useTasks } from "@/queries/tasks";
import {
  entriesKey,
  useBulkCreateEntries,
  useCreateEntry,
  useEntriesRange,
} from "@/queries/timeEntries";
import { findFreeSlot } from "./freeSlot";
import {
  addDaysISO,
  fromISODate,
  todayISO,
  weekDaysISO,
  type WeekStart,
} from "@/lib/dates";
import { formatHours } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeAxis } from "./TimeAxis";
import { DayColumn } from "./DayColumn";
import { EntryDialog, type EntryDraft } from "./EntryDialog";

const DEFAULTS = {
  dayStartMinute: 540,
  dayEndMinute: 1140,
  gridStepMinutes: 10,
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

  function openCreate(d: EntryDraft) {
    setDraft(d);
    setDialogOpen(true);
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
      acc.set(e.projectId, (acc.get(e.projectId) ?? 0) + (e.endMinute - e.startMinute));
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
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            {t("common.today")}
          </Button>
          <span className="ml-2 font-medium capitalize">{periodLabel}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {t("timesheet.total")}:{" "}
            <span className="font-semibold text-foreground">
              {formatHours(totalMinutes)} {t("common.hours")}
            </span>
          </div>
          <Button variant="outline" onClick={handleCopyPeriod}>
            <CopyPlus className="size-4" />
            {view === "week" ? t("timesheet.copyWeek") : t("timesheet.copyDay")}
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="week">{t("timesheet.week")}</TabsTrigger>
              <TabsTrigger value="day">{t("timesheet.day")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {perProject.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
      )}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <div className="flex">
            <div className="sticky left-0 z-10 bg-background">
              <div className="h-10" />
              <TimeAxis dayStart={gridStart} dayEnd={gridEnd} />
            </div>
            {days.map((d) => {
              const dayEntries = entriesByDay.get(d) ?? [];
              const dayMinutes = dayEntries.reduce(
                (s, e) => s + (e.endMinute - e.startMinute),
                0,
              );
              const isToday = d === todayISO();
              return (
                <div key={d} className="flex min-w-0 flex-1 flex-col border-l">
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
                    workspaceId={workspaceId}
                    userId={userId}
                    queryKey={queryKey}
                    onCreate={openCreate}
                    onEdit={openEdit}
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
    </div>
  );
}
