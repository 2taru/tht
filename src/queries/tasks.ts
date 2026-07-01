import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Label, Task, TaskPriority, TaskStatus } from "@/types/domain";

interface TaskRow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  position: number;
  assignee_id: string | null;
  task_labels: { labels: Label | null }[] | null;
}

export interface TaskWithLabels extends Task {
  labels: Label[];
}

const SELECT =
  "id, workspace_id, project_id, title, description, status, priority, start_date, due_date, position, assignee_id, task_labels(labels(id, name, color, workspace_id))";

function toDomain(row: TaskRow): TaskWithLabels {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    position: row.position,
    assigneeId: row.assignee_id,
    labels: (row.task_labels ?? [])
      .map((tl) => tl.labels)
      .filter((l): l is Label => !!l),
  };
}

export function tasksKey(workspaceId: string | null) {
  return ["tasks", workspaceId] as const;
}

export function useTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: tasksKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<TaskWithLabels[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(SELECT)
        .eq("workspace_id", workspaceId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data as unknown as TaskRow[]).map(toDomain);
    },
  });
}

export interface TaskInput {
  title: string;
  description: string | null;
  projectId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  assigneeId: string | null;
}

export function useCreateTask(
  workspaceId: string | null,
  userId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput): Promise<string> => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          workspace_id: workspaceId!,
          created_by: userId!,
          title: input.title,
          description: input.description,
          project_id: input.projectId,
          status: input.status,
          priority: input.priority,
          start_date: input.startDate,
          due_date: input.dueDate,
          assignee_id: input.assigneeId,
          position: Date.now(), // новий — у кінець колонки
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
    },
  });
}

export function useUpdateTask(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput & { id: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: input.title,
          description: input.description,
          project_id: input.projectId,
          status: input.status,
          priority: input.priority,
          start_date: input.startDate,
          due_date: input.dueDate,
          assignee_id: input.assigneeId,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
    },
  });
}

export function useDeleteTask(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
    },
  });
}

/** Переміщення картки: нова колонка (status) і/або позиція. Оптимістично. */
export function useMoveTask(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: TaskStatus;
      position: number;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: input.status, position: input.position })
        .eq("id", input.id);
      if (error) throw error;
    },
    onMutate: async (input) => {
      const key = tasksKey(workspaceId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskWithLabels[]>(key);
      if (prev) {
        qc.setQueryData<TaskWithLabels[]>(
          key,
          prev.map((tk) =>
            tk.id === input.id
              ? { ...tk, status: input.status, position: input.position }
              : tk,
          ),
        );
      }
      return { prev };
    },
    onError: (_e, _v, context) => {
      if (context?.prev) qc.setQueryData(tasksKey(workspaceId), context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
    },
  });
}
