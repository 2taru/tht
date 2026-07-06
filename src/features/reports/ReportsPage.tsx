import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { uk } from "date-fns/locale";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { m } from "motion/react";
import { contentEnter } from "@/lib/motion";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useMembers } from "@/queries/members";
import {
  useReportEntries,
  useReportEntriesAll,
  type ReportRow,
} from "@/queries/reports";
import { useSettings } from "@/queries/settings";
import { fromISODate, toISODate } from "@/lib/dates";
import { formatHours, minutesToHours } from "@/lib/time";
import { billableAmount, formatMoney } from "@/lib/money";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
  downloadXlsx,
  type Cell as XlsxCell,
  type Sheet as XlsxSheet,
} from "@/lib/xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function defaultRange() {
  const now = new Date();
  return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) };
}

/** Безпечний слаг із назви проєкту для імені файлу (кирилиця дозволена). */
function projectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Базове ім'я файлу експорту: `tht-[проєкт-]from_to`. */
function reportFilename(
  from: string,
  to: string,
  projectName: string | null,
  ext: string,
): string {
  const slug = projectName ? projectSlug(projectName) : "";
  return `tht-${slug ? `${slug}-` : ""}${from}_${to}.${ext}`;
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { workspace, workspaces } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;

  const { data: members } = useMembers(workspaceId);
  const membersById = useMemo(() => {
    const map = new Map<string, string>();
    (members ?? []).forEach((m) => map.set(m.userId, m.displayName ?? "—"));
    return map;
  }, [members]);
  const myRole = members?.find((m) => m.userId === userId)?.role;
  const canSeeTeam = myRole === "owner" || myRole === "admin";

  const [params, setParams] = useSearchParams();
  const def = defaultRange();
  const from = params.get("from") ?? def.from;
  const to = params.get("to") ?? def.to;

  // member-фільтр: "self" (за замовч.), "all" (вся команда) або user_id учасника.
  // Звичайний member завжди прив'язаний до власних годин.
  const [memberSel, setMemberSel] = useState<string>("self");
  const effectiveMember =
    !canSeeTeam || memberSel === "self"
      ? userId
      : memberSel === "all"
        ? null
        : memberSel;

  // scope: "this" — поточний простір, "all" — усі мої простори (крос-workspace).
  const [scope, setScope] = useState<"this" | "all">("this");
  const teamWide = scope === "this" && effectiveMember === null;

  const workspaceNameMap = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  );

  const { data: thisRows, isLoading: thisLoading } = useReportEntries(
    workspaceId,
    effectiveMember,
    from,
    to,
  );
  const { data: allRows, isLoading: allLoading } = useReportEntriesAll(
    scope === "all" ? userId : null,
    from,
    to,
  );
  const rows = scope === "all" ? allRows : thisRows;
  const isLoading = scope === "all" ? allLoading : thisLoading;
  const { data: settings } = useSettings(userId);
  const currency = settings?.currency ?? "UAH";

  // Діалог опцій Excel-експорту (перед вивантаженням питаємо про розбивку за описом).
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [splitByDesc, setSplitByDesc] = useState(false);

  // Фільтр за проєктом. Опції — з наявних у періоді записів (щоб не було порожніх).
  const [projectSel, setProjectSel] = useState<string>("all");
  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; label: string }>();
    (rows ?? []).forEach((r) => {
      if (map.has(r.projectId)) return;
      const label =
        scope === "all"
          ? `${r.projectName} · ${workspaceNameMap.get(r.workspaceId) ?? "—"}`
          : r.projectName;
      map.set(r.projectId, { id: r.projectId, name: r.projectName, label });
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, scope, workspaceNameMap]);
  // Якщо вибраний проєкт зник (зміна періоду/простору) — трактуємо як «усі».
  const activeProject =
    projectSel !== "all" && projectOptions.some((p) => p.id === projectSel)
      ? projectSel
      : "all";
  // Назва обраного проєкту (для назви файлу експорту); null = усі проєкти.
  const activeProjectName =
    activeProject === "all"
      ? null
      : (projectOptions.find((p) => p.id === activeProject)?.name ?? null);
  const viewRows = useMemo(
    () =>
      activeProject === "all"
        ? (rows ?? [])
        : (rows ?? []).filter((r) => r.projectId === activeProject),
    [rows, activeProject],
  );

  function setRange(nextFrom: string, nextTo: string) {
    const p = new URLSearchParams(params);
    p.set("from", nextFrom);
    p.set("to", nextTo);
    setParams(p, { replace: true });
  }
  function presetWeek() {
    const now = new Date();
    setRange(
      toISODate(startOfWeek(now, { weekStartsOn: 1 })),
      toISODate(endOfWeek(now, { weekStartsOn: 1 })),
    );
  }
  function presetMonth() {
    const now = new Date();
    setRange(toISODate(startOfMonth(now)), toISODate(endOfMonth(now)));
  }

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    viewRows.forEach((r) =>
      map.set(r.date, (map.get(r.date) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, minutes]) => ({
        date: format(fromISODate(date), "d MMM", { locale: uk }),
        hours: minutesToHours(minutes),
      }));
  }, [viewRows]);

  const byProject = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        minutes: number;
        rate: number | null;
        workspaceId: string;
      }
    >();
    viewRows.forEach((r) => {
      const cur = map.get(r.projectId) ?? {
        id: r.projectId,
        name: r.projectName,
        color: r.projectColor,
        minutes: 0,
        rate: r.projectRate,
        workspaceId: r.workspaceId,
      };
      cur.minutes += r.minutes;
      map.set(r.projectId, cur);
    });
    return [...map.values()].sort((a, b) => b.minutes - a.minutes);
  }, [viewRows]);

  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    viewRows.forEach((r) =>
      map.set(r.userId, (map.get(r.userId) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .map(([uid, minutes]) => ({
        uid,
        name: membersById.get(uid) ?? "—",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [viewRows, membersById]);

  const byWorkspace = useMemo(() => {
    const map = new Map<string, number>();
    viewRows.forEach((r) =>
      map.set(r.workspaceId, (map.get(r.workspaceId) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .map(([wsId, minutes]) => ({
        wsId,
        name: workspaceNameMap.get(wsId) ?? "—",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [viewRows, workspaceNameMap]);

  // Розбивка по задачах (для деталізованого Excel): проєкт → задача → хвилини.
  interface TaskGroup {
    projectName: string;
    taskTitle: string;
    description: string;
    minutes: number;
    rate: number | null;
    workspaceId: string;
  }
  function taskBreakdown(splitByDesc: boolean): TaskGroup[] {
    const map = new Map<string, TaskGroup>();
    viewRows.forEach((r) => {
      const taskTitle = r.taskTitle ?? t("reports.noTask");
      const description = splitByDesc ? (r.description ?? "") : "";
      const key = `${r.projectId}|${taskTitle}|${description}`;
      const cur = map.get(key) ?? {
        projectName: r.projectName,
        taskTitle,
        description,
        minutes: 0,
        rate: r.projectRate,
        workspaceId: r.workspaceId,
      };
      cur.minutes += r.minutes;
      map.set(key, cur);
    });
    return [...map.values()].sort(
      (a, b) =>
        a.projectName.localeCompare(b.projectName) ||
        a.taskTitle.localeCompare(b.taskTitle) ||
        b.minutes - a.minutes,
    );
  }

  const totalMinutes = viewRows.reduce((s, r) => s + r.minutes, 0);
  const totalAmount = byProject.reduce(
    (s, p) => s + billableAmount(p.minutes, p.rate),
    0,
  );
  const hasBillable = byProject.some((p) => p.rate != null);

  function handleExportCsv() {
    const isAllScope = scope === "all";
    const headers = [
      t("reports.csvDate"),
      ...(isAllScope ? [t("reports.csvWorkspace")] : []),
      ...(teamWide ? [t("reports.csvMember")] : []),
      t("reports.csvProject"),
      t("reports.csvTask"),
      t("reports.csvDescription"),
      t("reports.csvHours"),
      t("reports.csvAmount"),
    ];
    const csvRows = viewRows.map((r: ReportRow) => [
      r.date,
      ...(isAllScope ? [workspaceNameMap.get(r.workspaceId) ?? "—"] : []),
      ...(teamWide ? [membersById.get(r.userId) ?? "—"] : []),
      r.projectName,
      r.taskTitle ?? "",
      r.description ?? "",
      (r.minutes / 60).toFixed(2),
      r.projectRate != null
        ? billableAmount(r.minutes, r.projectRate).toFixed(2)
        : "",
    ]);
    downloadCsv(
      reportFilename(from, to, activeProjectName, "csv"),
      toCsv(headers, csvRows),
    );
  }

  function handleExportExcel(splitByDesc: boolean) {
    const isAllScope = scope === "all";
    const hours = (min: number) => Number((min / 60).toFixed(2));
    const amount = (min: number, rate: number | null) =>
      rate != null ? Number(billableAmount(min, rate).toFixed(2)) : null;

    // ── Аркуш 1 «Задачі»: години на кожну задачу (+ опис, якщо splitByDesc) + разом.
    const groups = taskBreakdown(splitByDesc);
    const taskHeader: XlsxCell[] = [];
    if (isAllScope) taskHeader.push(t("reports.csvWorkspace"));
    taskHeader.push(t("reports.csvProject"), t("reports.csvTask"));
    if (splitByDesc) taskHeader.push(t("reports.csvDescription"));
    taskHeader.push(t("reports.csvHours"));
    if (hasBillable) taskHeader.push(t("reports.csvAmount"));

    const taskRows: XlsxCell[][] = groups.map((g) => {
      const row: XlsxCell[] = [];
      if (isAllScope) row.push(workspaceNameMap.get(g.workspaceId) ?? "—");
      row.push(g.projectName, g.taskTitle);
      if (splitByDesc) row.push(g.description);
      row.push(hours(g.minutes));
      if (hasBillable) row.push(amount(g.minutes, g.rate));
      return row;
    });
    // Індекси колонок (для графіка й підсумку) залежать від опційних колонок.
    const catCol = isAllScope ? 2 : 1; // колонка «Задача»
    const hoursCol = taskHeader.length - (hasBillable ? 2 : 1);

    // Підсумковий рядок «Разом» — «Разом» кладемо в колонку «Задача».
    const totalRow: XlsxCell[] = new Array(taskHeader.length).fill("");
    totalRow[catCol] = t("reports.total");
    totalRow[hoursCol] = hours(totalMinutes);
    if (hasBillable) totalRow[taskHeader.length - 1] = Number(totalAmount.toFixed(2));

    const taskSheetRows = [taskHeader, ...taskRows, totalRow];
    const taskColWidths = taskHeader.map((h, i) =>
      i === catCol || (splitByDesc && i === catCol + 1)
        ? { width: 34 }
        : typeof h === "string" && h.length > 8
          ? { width: 16 }
          : { width: 12 },
    );

    // Графік — лише коли є що показувати (щоб не малювати порожній блок).
    const dataFirstRow = 2;
    const dataLastRow = 1 + groups.length;
    const taskSheet: XlsxSheet = {
      name: t("reports.sheetTasks"),
      rows: taskSheetRows,
      columns: taskColWidths,
      totalRow: true,
      chart:
        groups.length > 0
          ? {
              title: t("reports.chartTitle"),
              categoryCol: catCol,
              valueCol: hoursCol,
              seriesNameRow: 1,
              dataFirstRow,
              dataLastRow,
              anchor: {
                fromCol: 0,
                fromRow: dataLastRow + 2,
                toCol: Math.max(6, taskHeader.length + 2),
                toRow: dataLastRow + 2 + Math.min(24, Math.max(10, groups.length + 3)),
              },
            }
          : undefined,
    };

    // ── Аркуш 2 «Деталі»: усі записи періоду (з колонкою опису завжди).
    const detailHeader: XlsxCell[] = [
      t("reports.csvDate"),
      ...(isAllScope ? [t("reports.csvWorkspace")] : []),
      ...(teamWide ? [t("reports.csvMember")] : []),
      t("reports.csvProject"),
      t("reports.csvTask"),
      t("reports.csvDescription"),
      t("reports.csvHours"),
      ...(hasBillable ? [t("reports.csvAmount")] : []),
    ];
    const detailRows: XlsxCell[][] = viewRows.map((r) => [
      r.date,
      ...(isAllScope ? [workspaceNameMap.get(r.workspaceId) ?? "—"] : []),
      ...(teamWide ? [membersById.get(r.userId) ?? "—"] : []),
      r.projectName,
      r.taskTitle ?? "",
      r.description ?? "",
      hours(r.minutes),
      ...(hasBillable ? [amount(r.minutes, r.projectRate)] : []),
    ]);
    const detailSheet: XlsxSheet = {
      name: t("reports.sheetDetails"),
      rows: [detailHeader, ...detailRows],
      columns: detailHeader.map((h) =>
        typeof h === "string" && h === t("reports.csvDescription")
          ? { width: 34 }
          : { width: 14 },
      ),
    };

    downloadXlsx(reportFilename(from, to, activeProjectName, "xlsx"), [
      taskSheet,
      detailSheet,
    ]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("reports.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={viewRows.length === 0}
          >
            <Download className="size-4" />
            {t("reports.export")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setExcelDialogOpen(true)}
            disabled={viewRows.length === 0}
          >
            <Download className="size-4" />
            {t("reports.exportExcel")}
          </Button>
        </div>
      </div>

      <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reports.excelOptionsTitle")}</DialogTitle>
            <DialogDescription>
              {t("reports.excelOptionsDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 py-2">
            <Label htmlFor="split-desc" className="font-normal">
              {t("reports.splitByDescription")}
            </Label>
            <Switch
              id="split-desc"
              checked={splitByDesc}
              onCheckedChange={setSplitByDesc}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExcelDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                handleExportExcel(splitByDesc);
                setExcelDialogOpen(false);
              }}
            >
              <Download className="size-4" />
              {t("reports.exportExcel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("reports.from")}
          </label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setRange(e.target.value, to)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("reports.to")}
          </label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setRange(from, e.target.value)}
            className="w-40"
          />
        </div>
        <Button variant="secondary" onClick={presetWeek}>
          {t("reports.thisWeek")}
        </Button>
        <Button variant="secondary" onClick={presetMonth}>
          {t("reports.thisMonth")}
        </Button>
        {workspaces.length > 1 && (
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as "this" | "all")}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this">{t("reports.scopeThis")}</SelectItem>
              <SelectItem value="all">{t("reports.scopeAll")}</SelectItem>
            </SelectContent>
          </Select>
        )}
        {scope === "this" && canSeeTeam && (members?.length ?? 0) > 1 && (
          <Select value={memberSel} onValueChange={setMemberSel}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">{t("team.you")}</SelectItem>
              <SelectItem value="all">{t("reports.allMembers")}</SelectItem>
              {(members ?? [])
                .filter((m) => m.userId !== userId)
                .map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName ?? "—"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {projectOptions.length > 1 && (
          <Select value={activeProject} onValueChange={setProjectSel}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reports.allProjects")}</SelectItem>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {t("reports.total")}:{" "}
          <span className="font-semibold text-foreground">
            {formatHours(totalMinutes)} {t("common.hours")}
          </span>
        </div>
      </div>

      {scope === "all" && (
        <p className="w-full text-xs text-muted-foreground">
          {t("reports.allWorkspacesHint")}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : viewRows.length === 0 ? (
        <EmptyState>{t("reports.empty")}</EmptyState>
      ) : (
        <m.div {...contentEnter} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("reports.byDay")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byDay}>
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `${formatHours(Number(v) * 60)} ${t("common.hours")}`,
                        "",
                      ]}
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("reports.byProject")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={byProject}
                      dataKey="minutes"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {byProject.map((p) => (
                        <Cell key={p.id} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [
                        `${formatHours(Number(v))} ${t("common.hours")}`,
                        String(name),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {teamWide && byMember.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("reports.byMember")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {byMember.map((m) => (
                    <div key={m.uid} className="flex items-center gap-3 py-2">
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className="w-24 text-right font-medium">
                        {formatHours(m.minutes)} {t("common.hours")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scope === "all" && byWorkspace.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("reports.byWorkspace")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {byWorkspace.map((ws) => (
                    <div key={ws.wsId} className="flex items-center gap-3 py-2">
                      <span className="flex-1 truncate">{ws.name}</span>
                      <span className="w-24 text-right font-medium">
                        {formatHours(ws.minutes)} {t("common.hours")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("reports.summary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {byProject.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="flex-1">
                      {scope === "all"
                        ? `${p.name} · ${workspaceNameMap.get(p.workspaceId) ?? "—"}`
                        : p.name}
                    </span>
                    {hasBillable && (
                      <span className="w-28 text-right text-muted-foreground">
                        {p.rate != null
                          ? formatMoney(
                              billableAmount(p.minutes, p.rate),
                              currency,
                            )
                          : "—"}
                      </span>
                    )}
                    <span className="w-24 text-right font-medium">
                      {formatHours(p.minutes)} {t("common.hours")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-3 py-2 font-semibold">
                  <span className="flex-1 pl-6">{t("reports.total")}</span>
                  {hasBillable && (
                    <span className="w-28 text-right">
                      {formatMoney(totalAmount, currency)}
                    </span>
                  )}
                  <span className="w-24 text-right">
                    {formatHours(totalMinutes)} {t("common.hours")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}
    </div>
  );
}
