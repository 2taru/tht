import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import type { Project, TaskStatus } from "@/types/domain";
import type { TaskWithLabels } from "@/queries/tasks";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { statusLabelKey } from "./taskMeta";

interface BoardColumnProps {
  status: TaskStatus;
  tasks: TaskWithLabels[];
  projectsById: Map<string, Project>;
  onCardClick: (task: TaskWithLabels) => void;
}

export function BoardColumn({
  status,
  tasks,
  projectsById,
  onCardClick,
}: BoardColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <div className="flex min-h-0 w-full flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span>{t(statusLabelKey[status])}</span>
        <span className="text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/50",
        )}
      >
        <SortableContext
          items={tasks.map((tk) => tk.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((tk) => (
            <TaskCard
              key={tk.id}
              task={tk}
              project={tk.projectId ? projectsById.get(tk.projectId) : undefined}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
