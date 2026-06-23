import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { TimeEntry } from "@/types/domain";

type EntryUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

interface EntryRow {
  id: string;
  workspace_id: string;
  user_id: string;
  project_id: string;
  task_id: string | null;
  entry_date: string;
  start_minute: number;
  end_minute: number;
  description: string | null;
}

const SELECT =
  "id, workspace_id, user_id, project_id, task_id, entry_date, start_minute, end_minute, description";

function toDomain(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    projectId: row.project_id,
    taskId: row.task_id,
    entryDate: row.entry_date,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    description: row.description,
  };
}

/** SQLSTATE винятку exclusion-констрейнта (перетин інтервалів). */
export const OVERLAP_VIOLATION = "23P01";

export function entriesKey(
  workspaceId: string | null,
  userId: string | null,
  fromISO: string,
  toISO: string,
): QueryKey {
  return ["time-entries", workspaceId, userId, fromISO, toISO];
}

/** Записи часу в діапазоні дат [fromISO, toISO] (день = однаковий from/to). */
export function useEntriesRange(
  workspaceId: string | null,
  userId: string | null,
  fromISO: string,
  toISO: string,
) {
  return useQuery({
    queryKey: entriesKey(workspaceId, userId, fromISO, toISO),
    enabled: !!workspaceId && !!userId,
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(SELECT)
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId!)
        .gte("entry_date", fromISO)
        .lte("entry_date", toISO)
        .order("entry_date", { ascending: true })
        .order("start_minute", { ascending: true });
      if (error) throw error;
      return (data as EntryRow[]).map(toDomain);
    },
  });
}

/** Сумарні хвилини, залоговані на задачу (для діалогу задачі). */
export function useTaskMinutes(taskId: string | null) {
  return useQuery({
    queryKey: ["task-minutes", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("start_minute, end_minute")
        .eq("task_id", taskId!);
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, e) => sum + (e.end_minute - e.start_minute),
        0,
      );
    },
  });
}

export interface EntryInput {
  projectId: string;
  taskId: string | null;
  entryDate: string;
  startMinute: number;
  endMinute: number;
  description: string | null;
}

interface MutationCtx {
  workspaceId: string | null;
  userId: string | null;
  queryKey: QueryKey;
}

export function useCreateEntry(ctx: MutationCtx) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EntryInput): Promise<TimeEntry> => {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          workspace_id: ctx.workspaceId!,
          user_id: ctx.userId!,
          project_id: input.projectId,
          task_id: input.taskId,
          entry_date: input.entryDate,
          start_minute: input.startMinute,
          end_minute: input.endMinute,
          description: input.description,
        })
        .select(SELECT)
        .single();
      if (error) throw error;
      return toDomain(data as EntryRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ctx.queryKey });
    },
  });
}

export function useUpdateEntry(ctx: MutationCtx) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<EntryInput> & { id: string },
    ): Promise<TimeEntry> => {
      const patch: EntryUpdate = {};
      if (input.projectId !== undefined) patch.project_id = input.projectId;
      if (input.taskId !== undefined) patch.task_id = input.taskId;
      if (input.entryDate !== undefined) patch.entry_date = input.entryDate;
      if (input.startMinute !== undefined) patch.start_minute = input.startMinute;
      if (input.endMinute !== undefined) patch.end_minute = input.endMinute;
      if (input.description !== undefined) patch.description = input.description;
      const { data, error } = await supabase
        .from("time_entries")
        .update(patch)
        .eq("id", input.id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return toDomain(data as EntryRow);
    },
    // Оптимістично оновлюємо блок одразу (важливо для drag); відкат при помилці.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ctx.queryKey });
      const prev = qc.getQueryData<TimeEntry[]>(ctx.queryKey);
      if (prev) {
        qc.setQueryData<TimeEntry[]>(
          ctx.queryKey,
          prev.map((e) => (e.id === input.id ? { ...e, ...input } : e)),
        );
      }
      return { prev };
    },
    onError: (_err, _input, context) => {
      if (context?.prev) qc.setQueryData(ctx.queryKey, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ctx.queryKey });
    },
  });
}

/**
 * Масова вставка записів (копія дня/тижня). Вставляємо по одному й рахуємо
 * пропущені через перетин (23P01), щоб копія не падала через одну колізію.
 */
export function useBulkCreateEntries(ctx: MutationCtx) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      rows: EntryInput[],
    ): Promise<{ created: number; skipped: number }> => {
      let created = 0;
      let skipped = 0;
      for (const r of rows) {
        const { error } = await supabase.from("time_entries").insert({
          workspace_id: ctx.workspaceId!,
          user_id: ctx.userId!,
          project_id: r.projectId,
          task_id: r.taskId,
          entry_date: r.entryDate,
          start_minute: r.startMinute,
          end_minute: r.endMinute,
          description: r.description,
        });
        if (error) {
          if (error.code === OVERLAP_VIOLATION) skipped++;
          else throw error;
        } else {
          created++;
        }
      }
      return { created, skipped };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ctx.queryKey });
    },
  });
}

export function useDeleteEntry(ctx: MutationCtx) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ctx.queryKey });
      const prev = qc.getQueryData<TimeEntry[]>(ctx.queryKey);
      if (prev) {
        qc.setQueryData<TimeEntry[]>(
          ctx.queryKey,
          prev.filter((e) => e.id !== id),
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(ctx.queryKey, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ctx.queryKey });
    },
  });
}
