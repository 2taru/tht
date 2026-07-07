import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { m } from "motion/react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { listItem } from "@/lib/motion";
import type { Project, TaskPriority } from "@/types/domain";
import type { TaskWithLabels } from "@/queries/tasks";
import { fromISODate, todayISO } from "@/lib/dates";
import { classifyDue } from "@/lib/dueDate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { priorityClasses, priorityLabelKey, statusLabelKey } from "./taskMeta";
import {
  columnLabelKey,
  type ColumnKey,
  type ColumnVisibility,
} from "./taskColumns";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
export type SortKey = "priority" | "dueDate" | "title";

interface TaskListProps {
  tasks: TaskWithLabels[];
  projectsById: Map<string, Project>;
  membersById: Map<string, string>;
  sort: SortKey;
  columns: ColumnVisibility;
  onRowClick: (task: TaskWithLabels) => void;
}

interface Ctx {
  t: (k: string) => string;
  projectsById: Map<string, Project>;
  membersById: Map<string, string>;
}

interface ColumnDef {
  key: ColumnKey;
  /** Клас ширини/вирівнювання, спільний для заголовка й комірок. */
  cellClass: string;
  render: (tk: TaskWithLabels, ctx: Ctx) => ReactNode;
}

function dueDateLabel(tk: TaskWithLabels, t: Ctx["t"]): ReactNode {
  const fmt = (iso: string) => format(fromISODate(iso), "d MMM", { locale: uk });
  if (tk.startDate && tk.dueDate) return `${fmt(tk.startDate)} – ${fmt(tk.dueDate)}`;
  if (tk.dueDate) return fmt(tk.dueDate);
  if (tk.startDate) return `${t("tasks.fromShort")} ${fmt(tk.startDate)}`;
  return "";
}

const COLUMN_DEFS: ColumnDef[] = [
  {
    key: "project",
    cellClass: "w-36 shrink-0 max-lg:hidden",
    render: (tk, { projectsById }) => {
      const project = tk.projectId ? projectsById.get(tk.projectId) : undefined;
      if (!project) return null;
      return (
        <Badge
          variant="outline"
          className="max-w-full gap-1"
          style={{ borderColor: project.color }}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="truncate">{project.name}</span>
        </Badge>
      );
    },
  },
  {
    key: "priority",
    cellClass: "w-24 shrink-0",
    render: (tk, { t }) => (
      <Badge className={priorityClasses[tk.priority]}>
        {t(priorityLabelKey[tk.priority])}
      </Badge>
    ),
  },
  {
    key: "status",
    cellClass: "w-24 shrink-0 text-xs text-muted-foreground",
    render: (tk, { t }) => t(statusLabelKey[tk.status]),
  },
  {
    key: "assignee",
    cellClass: "w-28 shrink-0 truncate text-xs text-muted-foreground",
    render: (tk, { membersById }) =>
      tk.assigneeId ? membersById.get(tk.assigneeId) : "",
  },
  {
    key: "labels",
    cellClass: "w-40 shrink-0 max-lg:hidden",
    render: (tk) =>
      tk.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tk.labels.map((l) => (
            <span
              key={l.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      ) : null,
  },
  {
    key: "description",
    cellClass: "w-48 shrink-0 truncate text-xs text-muted-foreground max-lg:hidden",
    render: (tk) => tk.description ?? "",
  },
  {
    key: "dueDate",
    cellClass: "w-28 shrink-0 text-right text-xs",
    render: (tk, { t }) => (
      <span
        className={cn(
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
        {dueDateLabel(tk, t)}
      </span>
    ),
  },
];

export function TaskList({
  tasks,
  projectsById,
  membersById,
  sort,
  columns,
  onRowClick,
}: TaskListProps) {
  const { t } = useTranslation();
  const ctx: Ctx = { t, projectsById, membersById };

  const activeColumns = useMemo(
    () => COLUMN_DEFS.filter((c) => columns[c.key]),
    [columns],
  );

  const rows = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sort === "priority")
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sort === "dueDate")
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      return a.title.localeCompare(b.title);
    });
  }, [tasks, sort]);

  if (rows.length === 0) {
    return <EmptyState>{t("tasks.empty")}</EmptyState>;
  }

  return (
    <div className="rounded-lg border">
      <div className="min-w-[560px]">
        {/* Шапка колонок */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span className="min-w-0 flex-1">{t("tasks.titleField")}</span>
          {activeColumns.map((col) => (
            <span key={col.key} className={cn(col.cellClass, "whitespace-nowrap")}>
              {t(columnLabelKey[col.key])}
            </span>
          ))}
        </div>

        <div className="divide-y">
          {rows.map((tk, i) => (
            <m.button
              key={tk.id}
              {...listItem(i)}
              type="button"
              onClick={() => onRowClick(tk)}
              className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {tk.title}
              </span>
              {activeColumns.map((col) => (
                <span key={col.key} className={col.cellClass}>
                  {col.render(tk, ctx)}
                </span>
              ))}
            </m.button>
          ))}
        </div>
      </div>
    </div>
  );
}
