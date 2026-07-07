import { useCallback, useState } from "react";

/** Колонки списку задач, які можна вмикати/вимикати (окрім назви — вона завжди є). */
export type ColumnKey =
  | "project"
  | "priority"
  | "status"
  | "assignee"
  | "labels"
  | "description"
  | "dueDate";

export type ColumnVisibility = Record<ColumnKey, boolean>;

/** Порядок відображення колонок (і в списку, і в меню налаштувань). */
export const COLUMN_ORDER: ColumnKey[] = [
  "project",
  "priority",
  "status",
  "assignee",
  "labels",
  "description",
  "dueDate",
];

export const columnLabelKey: Record<ColumnKey, string> = {
  project: "tasks.project",
  priority: "tasks.priorityField",
  status: "tasks.statusField",
  assignee: "tasks.assignee",
  labels: "tasks.labels",
  description: "tasks.descriptionField",
  dueDate: "tasks.dueDate",
};

const DEFAULT_COLUMNS: ColumnVisibility = {
  project: true,
  priority: true,
  status: true,
  assignee: true,
  labels: false,
  description: false,
  dueDate: true,
};

const STORAGE_KEY = "tht.taskListColumns";

function loadColumns(): ColumnVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMNS };
    const parsed = JSON.parse(raw) as Partial<ColumnVisibility>;
    // Мерджимо з дефолтом, щоб нові колонки зʼявлялись, а сміття не ламало тип.
    return { ...DEFAULT_COLUMNS, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMNS };
  }
}

/** Стан видимості колонок списку задач із збереженням у localStorage. */
export function useTaskColumns() {
  const [columns, setColumns] = useState<ColumnVisibility>(loadColumns);

  const toggle = useCallback((key: ColumnKey) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { columns, toggle };
}
