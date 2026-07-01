import type { TaskPriority, TaskStatus } from "@/types/domain";

/**
 * Формат перенесення даних між просторами (експорт/імпорт). Самодостатній JSON:
 * задачі й записи посилаються на проєкти/теги за ІНДЕКСОМ у відповідному масиві
 * (а не за id/назвою) — так перенесення не залежить від id і стійке до збігів назв.
 */
export const BUNDLE_FORMAT = "tht.workspace";
export const BUNDLE_VERSION = 1;

export interface BundleLabel {
  name: string;
  color: string;
}

export interface BundleProject {
  name: string;
  color: string;
  hourlyRate: number | null;
  isArchived: boolean;
}

export interface BundleTask {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  /** Індекс у `projects` або null (без проєкту). */
  projectIndex: number | null;
  /** Індекси у `labels`. */
  labelIndices: number[];
}

export interface BundleEntry {
  entryDate: string;
  startMinute: number;
  endMinute: number;
  description: string | null;
  /** Індекс у `projects` (запис часу завжди має проєкт). */
  projectIndex: number | null;
  /** Індекс у `tasks` або null. */
  taskIndex: number | null;
}

export interface WorkspaceBundle {
  format: typeof BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  workspaceName: string;
  labels: BundleLabel[];
  projects: BundleProject[];
  tasks: BundleTask[];
  entries: BundleEntry[];
}

/** Підрахунок вмісту бандла — для прев'ю в діалозі імпорту. */
export interface BundleCounts {
  projects: number;
  tasks: number;
  entries: number;
}

export function bundleCounts(b: WorkspaceBundle): BundleCounts {
  return {
    projects: b.projects.length,
    tasks: b.tasks.length,
    entries: b.entries.length,
  };
}

class BundleParseError extends Error {}
export function isBundleParseError(e: unknown): e is BundleParseError {
  return e instanceof BundleParseError;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Розбирає й валідує JSON-бандл. Кидає BundleParseError за невірного формату.
 * Читаємо лише відомі поля у нові plain-обʼєкти (без прототипного забруднення).
 */
export function parseBundle(text: string): WorkspaceBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BundleParseError("invalid json");
  }
  if (!raw || typeof raw !== "object") {
    throw new BundleParseError("not an object");
  }
  const o = raw as Record<string, unknown>;
  if (o.format !== BUNDLE_FORMAT) {
    throw new BundleParseError("wrong format");
  }

  const labels: BundleLabel[] = asArray(o.labels).map((l) => {
    const r = l as Record<string, unknown>;
    return { name: String(r.name ?? ""), color: String(r.color ?? "#64748b") };
  });

  const projects: BundleProject[] = asArray(o.projects).map((p) => {
    const r = p as Record<string, unknown>;
    return {
      name: String(r.name ?? ""),
      color: String(r.color ?? "#6366f1"),
      hourlyRate:
        r.hourlyRate == null || Number.isNaN(Number(r.hourlyRate))
          ? null
          : Number(r.hourlyRate),
      isArchived: Boolean(r.isArchived),
    };
  });

  const num = (v: unknown): number | null =>
    v == null || Number.isNaN(Number(v)) ? null : Number(v);
  const idx = (v: unknown): number | null => {
    const n = num(v);
    return n == null ? null : Math.trunc(n);
  };

  const tasks: BundleTask[] = asArray(o.tasks).map((tk) => {
    const r = tk as Record<string, unknown>;
    return {
      title: String(r.title ?? ""),
      description: r.description == null ? null : String(r.description),
      status: (r.status as TaskStatus) ?? "todo",
      priority: (r.priority as TaskPriority) ?? "medium",
      startDate: r.startDate == null ? null : String(r.startDate),
      dueDate: r.dueDate == null ? null : String(r.dueDate),
      position: num(r.position) ?? 0,
      projectIndex: idx(r.projectIndex),
      labelIndices: asArray(r.labelIndices)
        .map((i) => idx(i))
        .filter((i): i is number => i != null),
    };
  });

  const entries: BundleEntry[] = asArray(o.entries).map((e) => {
    const r = e as Record<string, unknown>;
    return {
      entryDate: String(r.entryDate ?? ""),
      startMinute: num(r.startMinute) ?? 0,
      endMinute: num(r.endMinute) ?? 0,
      description: r.description == null ? null : String(r.description),
      projectIndex: idx(r.projectIndex),
      taskIndex: idx(r.taskIndex),
    };
  });

  return {
    format: BUNDLE_FORMAT,
    version: num(o.version) ?? BUNDLE_VERSION,
    exportedAt: String(o.exportedAt ?? ""),
    workspaceName: String(o.workspaceName ?? ""),
    labels,
    projects,
    tasks,
    entries,
  };
}

/** Завантажує обʼєкт як .json-файл. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Безпечна назва файлу з назви простору. */
export function bundleFilename(workspaceName: string): string {
  const slug =
    workspaceName
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  const date = new Date().toISOString().slice(0, 10);
  return `tht-${slug}-${date}.json`;
}
