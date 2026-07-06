import { useMemo } from "react";
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
  onRowClick: (task: TaskWithLabels) => void;
}

export function TaskList({
  tasks,
  projectsById,
  membersById,
  sort,
  onRowClick,
}: TaskListProps) {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sort === "priority")
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sort === "dueDate")
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      return a.title.localeCompare(b.title);
    });
  }, [tasks, sort]);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyState>{t("tasks.empty")}</EmptyState>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((tk, i) => {
            const project = tk.projectId
              ? projectsById.get(tk.projectId)
              : undefined;
            return (
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
                {project && (
                  <Badge
                    variant="outline"
                    className="gap-1"
                    style={{ borderColor: project.color }}
                  >
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
                <span className="w-24 text-xs text-muted-foreground max-sm:hidden">
                  {t(statusLabelKey[tk.status])}
                </span>
                <span className="w-28 truncate text-xs text-muted-foreground max-sm:hidden">
                  {tk.assigneeId ? membersById.get(tk.assigneeId) : ""}
                </span>
                <span
                  className={cn(
                    "w-28 text-right text-xs",
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
                  {(() => {
                    const fmt = (iso: string) =>
                      format(fromISODate(iso), "d MMM", { locale: uk });
                    if (tk.startDate && tk.dueDate)
                      return `${fmt(tk.startDate)} – ${fmt(tk.dueDate)}`;
                    if (tk.dueDate) return fmt(tk.dueDate);
                    if (tk.startDate)
                      return `${t("tasks.fromShort")} ${fmt(tk.startDate)}`;
                    return "";
                  })()}
                </span>
              </m.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
