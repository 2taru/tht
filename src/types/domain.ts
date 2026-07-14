/**
 * Доменні типи (camelCase). Мапінг snake_case ↔ camelCase живе у `queries/*`.
 * Enum-и віддзеркалюють CHECK/enum зі схеми БД (див. PLAN.md розділ 5).
 */

export type Role = "owner" | "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface UserSettings {
  userId: string;
  dayStartMinute: number;
  dayEndMinute: number;
  gridStepMinutes: number;
  weekStart: number;
  theme: string;
  locale: string;
  currency: string;
  /** Тривалість робочого дня у хвилинах (норма). */
  workDayMinutes: number;
  /** Робочі дні тижня: 0 = неділя … 6 = субота (як JS getDay()). */
  workDays: number[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  isArchived: boolean;
  hourlyRate: number | null;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  assigneeId: string | null;
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  entryDate: string;
  startMinute: number;
  endMinute: number;
  description: string | null;
}
