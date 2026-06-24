import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { Project, TaskPriority, TaskStatus } from "@/types/domain";
import type { TaskWithLabels } from "@/queries/tasks";
import { fromISODate, todayISO } from "@/lib/dates";
import { classifyDue } from "@/lib/dueDate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIORITIES,
  STATUSES,
  priorityClasses,
  priorityLabelKey,
  statusLabelKey,
} from "./taskMeta";

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
type SortKey = "priority" | "dueDate" | "title";

interface TaskListProps {
  tasks: TaskWithLabels[];
  projects: Project[];
  projectsById: Map<string, Project>;
  membersById: Map<string, string>;
  onRowClick: (task: TaskWithLabels) => void;
}

export function TaskList({
  tasks,
  projects,
  projectsById,
  membersById,
  onRowClick,
}: TaskListProps) {
  const { t } = useTranslation();
  const [statusF, setStatusF] = useState<TaskStatus | "all">("all");
  const [priorityF, setPriorityF] = useState<TaskPriority | "all">("all");
  const [projectF, setProjectF] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("priority");

  const rows = useMemo(() => {
    let r = tasks.filter(
      (tk) =>
        (statusF === "all" || tk.status === statusF) &&
        (priorityF === "all" || tk.priority === priorityF) &&
        (projectF === "all" || tk.projectId === projectF),
    );
    r = [...r].sort((a, b) => {
      if (sort === "priority")
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sort === "dueDate")
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      return a.title.localeCompare(b.title);
    });
    return r;
  }, [tasks, statusF, priorityF, projectF, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={statusF}
          onChange={(v) => setStatusF(v as TaskStatus | "all")}
          allLabel={t("tasks.allStatuses")}
          options={STATUSES.map((s) => ({ value: s, label: t(statusLabelKey[s]) }))}
        />
        <FilterSelect
          value={priorityF}
          onChange={(v) => setPriorityF(v as TaskPriority | "all")}
          allLabel={t("tasks.allPriorities")}
          options={PRIORITIES.map((p) => ({
            value: p,
            label: t(priorityLabelKey[p]),
          }))}
        />
        <FilterSelect
          value={projectF}
          onChange={setProjectF}
          allLabel={t("tasks.allProjects")}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="ml-auto">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">{t("tasks.sortPriority")}</SelectItem>
              <SelectItem value="dueDate">{t("tasks.sortDue")}</SelectItem>
              <SelectItem value="title">{t("tasks.sortTitle")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState>{t("tasks.empty")}</EmptyState>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((tk) => {
            const project = tk.projectId ? projectsById.get(tk.projectId) : undefined;
            return (
              <button
                key={tk.id}
                type="button"
                onClick={() => onRowClick(tk)}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {tk.title}
                </span>
                {project && (
                  <Badge variant="outline" className="gap-1" style={{ borderColor: project.color }}>
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </Badge>
                )}
                <Badge className={priorityClasses[tk.priority]}>
                  {t(priorityLabelKey[tk.priority])}
                </Badge>
                <span className="w-24 text-xs text-muted-foreground">
                  {t(statusLabelKey[tk.status])}
                </span>
                <span className="w-28 truncate text-xs text-muted-foreground">
                  {tk.assigneeId ? membersById.get(tk.assigneeId) : ""}
                </span>
                <span
                  className={cn(
                    "w-16 text-right text-xs",
                    (() => {
                      if (!tk.dueDate) return "text-muted-foreground";
                      const due =
                        tk.status === "done"
                          ? "none"
                          : classifyDue(tk.dueDate, todayISO());
                      return due === "overdue"
                        ? "font-medium text-destructive"
                        : due === "today" || due === "soon"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground";
                    })(),
                  )}
                >
                  {tk.dueDate
                    ? format(fromISODate(tk.dueDate), "d MMM", { locale: uk })
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}

function FilterSelect({ value, onChange, allLabel, options }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
