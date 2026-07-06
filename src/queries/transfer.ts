import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  BUNDLE_FORMAT,
  BUNDLE_VERSION,
  type BundleEntry,
  type BundleTask,
  type WorkspaceBundle,
} from "@/lib/workspaceTransfer";
import { OVERLAP_VIOLATION } from "./timeEntries";
import { projectsKey } from "./projects";
import { tasksKey } from "./tasks";
import { labelsKey } from "./labels";

export interface TransferScope {
  projects: boolean;
  tasks: boolean;
  entries: boolean;
}

/**
 * Опційний діапазон дат для експорту (обидві межі включно, формат YYYY-MM-DD).
 * `null` у полі — межа відсутня. Порожній діапазон = експорт усього.
 * Застосовується лише до задач (за `created_at`) і записів часу (за `entry_date`);
 * проєкти й теги завжди експортуються повністю (задачі/записи на них посилаються).
 */
export interface TransferRange {
  from: string | null;
  to: string | null;
}

/** Задачі й записи тягнуть за собою проєкти — тож проєкти вмикаються примусово. */
function normalizeScope(s: TransferScope): TransferScope {
  const projects = s.projects || s.tasks || s.entries;
  return { projects, tasks: s.tasks, entries: s.entries };
}

/** Наступний день (ексклюзивна верхня межа для timestamptz `created_at`). */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Експорт ──────────────────────────────────────────────────────────────────

export function useExportWorkspace(workspaceId: string | null) {
  return useMutation({
    mutationFn: async (input: {
      workspaceName: string;
      scope: TransferScope;
      range?: TransferRange;
    }): Promise<WorkspaceBundle> => {
      const scope = normalizeScope(input.scope);
      const range = input.range ?? { from: null, to: null };
      const ws = workspaceId!;

      let taskQuery = scope.tasks
        ? supabase
            .from("tasks")
            .select(
              "id, project_id, title, description, status, priority, start_date, due_date, position, task_labels(label_id)",
            )
            .eq("workspace_id", ws)
            .order("position", { ascending: true })
        : null;
      // Задачі фільтруємо за датою СТВОРЕННЯ (created_at — timestamptz).
      if (taskQuery && range.from) taskQuery = taskQuery.gte("created_at", range.from);
      if (taskQuery && range.to)
        taskQuery = taskQuery.lt("created_at", nextDay(range.to));

      let entryQuery = scope.entries
        ? supabase
            .from("time_entries")
            .select(
              "project_id, task_id, entry_date, start_minute, end_minute, description",
            )
            .eq("workspace_id", ws)
            .order("entry_date", { ascending: true })
        : null;
      // Записи часу фільтруємо за датою запису (entry_date — date, обидві межі включно).
      if (entryQuery && range.from) entryQuery = entryQuery.gte("entry_date", range.from);
      if (entryQuery && range.to) entryQuery = entryQuery.lte("entry_date", range.to);

      const [projRes, labelRes, taskRes, entryRes] = await Promise.all([
        scope.projects
          ? supabase
              .from("projects")
              .select("id, name, color, hourly_rate, is_archived")
              .eq("workspace_id", ws)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        scope.projects || scope.tasks
          ? supabase
              .from("labels")
              .select("id, name, color")
              .eq("workspace_id", ws)
          : Promise.resolve({ data: [], error: null }),
        taskQuery ?? Promise.resolve({ data: [], error: null }),
        entryQuery ?? Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [projRes, labelRes, taskRes, entryRes]) {
        if (r.error) throw r.error;
      }

      const projects = (projRes.data ?? []) as {
        id: string;
        name: string;
        color: string;
        hourly_rate: number | string | null;
        is_archived: boolean;
      }[];
      const labels = (labelRes.data ?? []) as {
        id: string;
        name: string;
        color: string;
      }[];
      const tasks = (taskRes.data ?? []) as {
        id: string;
        project_id: string | null;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        start_date: string | null;
        due_date: string | null;
        position: number;
        task_labels: { label_id: string }[] | null;
      }[];
      const entries = (entryRes.data ?? []) as {
        project_id: string;
        task_id: string | null;
        entry_date: string;
        start_minute: number;
        end_minute: number;
        description: string | null;
      }[];

      const projectIndex = new Map<string, number>();
      projects.forEach((p, i) => projectIndex.set(p.id, i));
      const labelIndex = new Map<string, number>();
      labels.forEach((l, i) => labelIndex.set(l.id, i));
      const taskIndex = new Map<string, number>();
      tasks.forEach((tk, i) => taskIndex.set(tk.id, i));

      const bundleTasks: BundleTask[] = tasks.map((tk) => ({
        title: tk.title,
        description: tk.description,
        status: tk.status as BundleTask["status"],
        priority: tk.priority as BundleTask["priority"],
        startDate: tk.start_date,
        dueDate: tk.due_date,
        position: tk.position,
        projectIndex:
          tk.project_id != null
            ? (projectIndex.get(tk.project_id) ?? null)
            : null,
        labelIndices: (tk.task_labels ?? [])
          .map((tl) => labelIndex.get(tl.label_id))
          .filter((i): i is number => i != null),
      }));

      const bundleEntries: BundleEntry[] = entries.map((e) => ({
        entryDate: e.entry_date,
        startMinute: e.start_minute,
        endMinute: e.end_minute,
        description: e.description,
        projectIndex: projectIndex.get(e.project_id) ?? null,
        // Задача в бандлі є лише якщо задачі теж експортуємо.
        taskIndex:
          scope.tasks && e.task_id != null
            ? (taskIndex.get(e.task_id) ?? null)
            : null,
      }));

      return {
        format: BUNDLE_FORMAT,
        version: BUNDLE_VERSION,
        exportedAt: new Date().toISOString(),
        workspaceName: input.workspaceName,
        labels: labels.map((l) => ({ name: l.name, color: l.color })),
        projects: projects.map((p) => ({
          name: p.name,
          color: p.color,
          hourlyRate: p.hourly_rate == null ? null : Number(p.hourly_rate),
          isArchived: p.is_archived,
        })),
        tasks: bundleTasks,
        entries: bundleEntries,
      };
    },
  });
}

// ── Імпорт ───────────────────────────────────────────────────────────────────

export interface ImportSummary {
  projectsCreated: number;
  projectsReused: number;
  labelsCreated: number;
  tasksCreated: number;
  entriesCreated: number;
  entriesSkipped: number;
}

export function useImportWorkspace(
  workspaceId: string | null,
  userId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bundle: WorkspaceBundle;
      scope: TransferScope;
    }): Promise<ImportSummary> => {
      const ws = workspaceId!;
      const scope = normalizeScope(input.scope);
      const { bundle } = input;
      const summary: ImportSummary = {
        projectsCreated: 0,
        projectsReused: 0,
        labelsCreated: 0,
        tasksCreated: 0,
        entriesCreated: 0,
        entriesSkipped: 0,
      };

      // 1. Проєкти: збіг за назвою (реюз) або створення.
      const projectIdByIndex: (string | null)[] = new Array(
        bundle.projects.length,
      ).fill(null);
      if (scope.projects) {
        const { data: existing, error } = await supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", ws);
        if (error) throw error;
        const byName = new Map<string, string>();
        (existing ?? []).forEach((p) => byName.set(p.name.toLowerCase(), p.id));

        for (let i = 0; i < bundle.projects.length; i++) {
          const bp = bundle.projects[i];
          const key = bp.name.toLowerCase();
          const found = byName.get(key);
          if (found) {
            projectIdByIndex[i] = found;
            summary.projectsReused++;
            continue;
          }
          const { data, error: insErr } = await supabase
            .from("projects")
            .insert({
              workspace_id: ws,
              name: bp.name,
              color: bp.color,
              hourly_rate: bp.hourlyRate,
              is_archived: bp.isArchived,
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          projectIdByIndex[i] = data.id;
          byName.set(key, data.id);
          summary.projectsCreated++;
        }
      }

      // 2. Теги: збіг за назвою або створення (лише коли є задачі).
      const labelIdByIndex: (string | null)[] = new Array(
        bundle.labels.length,
      ).fill(null);
      if (scope.tasks && bundle.labels.length > 0) {
        const { data: existing, error } = await supabase
          .from("labels")
          .select("id, name")
          .eq("workspace_id", ws);
        if (error) throw error;
        const byName = new Map<string, string>();
        (existing ?? []).forEach((l) => byName.set(l.name.toLowerCase(), l.id));

        for (let i = 0; i < bundle.labels.length; i++) {
          const bl = bundle.labels[i];
          const key = bl.name.toLowerCase();
          const found = byName.get(key);
          if (found) {
            labelIdByIndex[i] = found;
            continue;
          }
          const { data, error: insErr } = await supabase
            .from("labels")
            .insert({ workspace_id: ws, name: bl.name, color: bl.color })
            .select("id")
            .single();
          if (insErr) throw insErr;
          labelIdByIndex[i] = data.id;
          byName.set(key, data.id);
          summary.labelsCreated++;
        }
      }

      // 3. Задачі: завжди створюємо нові (дублі назв — легітимні).
      const taskIdByIndex: (string | null)[] = new Array(
        bundle.tasks.length,
      ).fill(null);
      if (scope.tasks) {
        for (let i = 0; i < bundle.tasks.length; i++) {
          const bt = bundle.tasks[i];
          const projectId =
            bt.projectIndex != null
              ? (projectIdByIndex[bt.projectIndex] ?? null)
              : null;
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              workspace_id: ws,
              created_by: userId!,
              title: bt.title,
              description: bt.description,
              project_id: projectId,
              status: bt.status,
              priority: bt.priority,
              start_date: bt.startDate,
              due_date: bt.dueDate,
              position: bt.position,
            })
            .select("id")
            .single();
          if (error) throw error;
          taskIdByIndex[i] = data.id;
          summary.tasksCreated++;

          const links = bt.labelIndices
            .map((li) => labelIdByIndex[li])
            .filter((id): id is string => !!id)
            .map((label_id) => ({ task_id: data.id, label_id }));
          if (links.length > 0) {
            const { error: linkErr } = await supabase
              .from("task_labels")
              .insert(links);
            if (linkErr) throw linkErr;
          }
        }
      }

      // 4. Записи часу: власником стає імпортер; перетини пропускаємо (23P01).
      if (scope.entries) {
        for (const be of bundle.entries) {
          const projectId =
            be.projectIndex != null
              ? (projectIdByIndex[be.projectIndex] ?? null)
              : null;
          if (!projectId) {
            summary.entriesSkipped++; // запис без валідного проєкту — не вставляємо
            continue;
          }
          const taskId =
            scope.tasks && be.taskIndex != null
              ? (taskIdByIndex[be.taskIndex] ?? null)
              : null;
          const { error } = await supabase.from("time_entries").insert({
            workspace_id: ws,
            user_id: userId!,
            project_id: projectId,
            task_id: taskId,
            entry_date: be.entryDate,
            start_minute: be.startMinute,
            end_minute: be.endMinute,
            description: be.description,
          });
          if (error) {
            if (error.code === OVERLAP_VIOLATION) summary.entriesSkipped++;
            else throw error;
          } else {
            summary.entriesCreated++;
          }
        }
      }

      return summary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
      qc.invalidateQueries({ queryKey: labelsKey(workspaceId) });
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["report"] });
    },
  });
}
