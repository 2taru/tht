import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { CalendarDays, GripVertical } from "lucide-react";
import type { Project } from "@/types/domain";
import type { TaskWithLabels } from "@/queries/tasks";
import { fromISODate, todayISO } from "@/lib/dates";
import { classifyDue } from "@/lib/dueDate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { priorityClasses, priorityLabelKey } from "./taskMeta";

interface TaskCardProps {
  task: TaskWithLabels;
  project: Project | undefined;
  assigneeName?: string;
  onClick: (task: TaskWithLabels) => void;
}

export function TaskCard({ task, project, assigneeName, onClick }: TaskCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <m.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      transition={{ duration: 0.18 }}
      className={cn("group rounded-lg border bg-card p-3 shadow-sm")}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          aria-label={t("tasks.drag")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onClick(task)}
          className="min-w-0 flex-1 space-y-2 text-left"
        >
          <p className="text-sm font-medium leading-snug">{task.title}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {project && (
              <Badge variant="outline" className="gap-1" style={{ borderColor: project.color }}>
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </Badge>
            )}
            <Badge className={priorityClasses[task.priority]}>
              {t(priorityLabelKey[task.priority])}
            </Badge>
            {task.dueDate &&
              (() => {
                const due =
                  task.status === "done"
                    ? "none"
                    : classifyDue(task.dueDate, todayISO());
                return (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      due === "overdue"
                        ? "font-medium text-destructive"
                        : due === "today" || due === "soon"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="size-3" />
                    {format(fromISODate(task.dueDate), "d MMM", { locale: uk })}
                  </span>
                );
              })()}
            {assigneeName && (
              <Avatar className="size-5" title={assigneeName}>
                <AvatarFallback className="text-[10px]">
                  {assigneeName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((l) => (
                <span
                  key={l.id}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>
    </m.div>
  );
}
