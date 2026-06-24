import type { TaskPriority, TaskStatus } from "@/types/domain";

export const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
export const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export const statusLabelKey: Record<TaskStatus, string> = {
  todo: "tasks.status.todo",
  in_progress: "tasks.status.in_progress",
  done: "tasks.status.done",
};

export const priorityLabelKey: Record<TaskPriority, string> = {
  low: "tasks.priority.low",
  medium: "tasks.priority.medium",
  high: "tasks.priority.high",
};

export const priorityClasses: Record<TaskPriority, string> = {
  low: "border-transparent bg-muted text-muted-foreground",
  medium:
    "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "border-transparent bg-destructive/15 text-destructive",
};
