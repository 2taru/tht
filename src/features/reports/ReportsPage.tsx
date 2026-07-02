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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function defaultRange() {
  const now = new Date();
  return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) };
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
    (rows ?? []).forEach((r) =>
      map.set(r.date, (map.get(r.date) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, minutes]) => ({
        date: format(fromISODate(date), "d MMM", { locale: uk }),
        hours: minutesToHours(minutes),
      }));
  }, [rows]);

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
    (rows ?? []).forEach((r) => {
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
  }, [rows]);

  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) =>
      map.set(r.userId, (map.get(r.userId) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .map(([uid, minutes]) => ({
        uid,
        name: membersById.get(uid) ?? "—",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [rows, membersById]);

  const byWorkspace = useMemo(() => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) =>
      map.set(r.workspaceId, (map.get(r.workspaceId) ?? 0) + r.minutes),
    );
    return [...map.entries()]
      .map(([wsId, minutes]) => ({
        wsId,
        name: workspaceNameMap.get(wsId) ?? "—",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [rows, workspaceNameMap]);

  const totalMinutes = (rows ?? []).reduce((s, r) => s + r.minutes, 0);
  const totalAmount = byProject.reduce(
    (s, p) => s + billableAmount(p.minutes, p.rate),
    0,
  );
  const hasBillable = byProject.some((p) => p.rate != null);

  function handleExport() {
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
    const csvRows = (rows ?? []).map((r: ReportRow) => [
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
    downloadCsv(`tht-${from}_${to}.csv`, toCsv(headers, csvRows));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("reports.title")}</h1>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!rows || rows.length === 0}
        >
          <Download className="size-4" />
          {t("reports.export")}
        </Button>
      </div>

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
      ) : !rows || rows.length === 0 ? (
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
