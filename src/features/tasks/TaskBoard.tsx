import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Project, TaskStatus } from "@/types/domain";
import { useMoveTask, type TaskWithLabels } from "@/queries/tasks";
import { BoardColumn } from "./BoardColumn";
import { TaskCard } from "./TaskCard";
import { STATUSES } from "./taskMeta";

interface TaskBoardProps {
  tasks: TaskWithLabels[];
  projectsById: Map<string, Project>;
  membersById: Map<string, string>;
  workspaceId: string | null;
  onCardClick: (task: TaskWithLabels) => void;
}

function midpoint(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return Date.now();
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

export function TaskBoard({
  tasks,
  projectsById,
  membersById,
  workspaceId,
  onCardClick,
}: TaskBoardProps) {
  const move = useMoveTask(workspaceId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithLabels[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    tasks.forEach((tk) => map[tk.status].push(tk));
    STATUSES.forEach((s) => map[s].sort((a, b) => a.position - b.position));
    return map;
  }, [tasks]);

  const activeTask = activeId
    ? tasks.find((tk) => tk.id === activeId)
    : undefined;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dragged = tasks.find((tk) => tk.id === active.id);
    if (!dragged) return;

    const overId = String(over.id);
    let targetStatus: TaskStatus;
    if (overId.startsWith("col:")) {
      targetStatus = overId.slice(4) as TaskStatus;
    } else {
      const overTask = tasks.find((tk) => tk.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    const column = byStatus[targetStatus].filter((tk) => tk.id !== dragged.id);
    let insertIndex = column.length;
    if (!overId.startsWith("col:")) {
      const idx = column.findIndex((tk) => tk.id === overId);
      if (idx !== -1) insertIndex = idx;
    }

    const newPosition = midpoint(
      column[insertIndex - 1]?.position,
      column[insertIndex]?.position,
    );

    if (targetStatus === dragged.status && newPosition === dragged.position) {
      return;
    }
    move.mutate({ id: dragged.id, status: targetStatus, position: newPosition });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid min-h-0 flex-1 auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            projectsById={projectsById}
            membersById={membersById}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            project={
              activeTask.projectId
                ? projectsById.get(activeTask.projectId)
                : undefined
            }
            assigneeName={
              activeTask.assigneeId
                ? membersById.get(activeTask.assigneeId)
                : undefined
            }
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
