import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DayOff } from "@/types/domain";

interface DayOffRow {
  id: string;
  workspace_id: string;
  user_id: string;
  date: string;
  note: string | null;
}

const SELECT = "id, workspace_id, user_id, date, note";

function toDomain(row: DayOffRow): DayOff {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    date: row.date,
    note: row.note,
  };
}

export function dayOffsKey(
  workspaceId: string | null,
  userId: string | null,
  fromISO?: string,
  toISO?: string,
): QueryKey {
  return ["day-offs", workspaceId, userId, fromISO ?? null, toISO ?? null];
}

/** Персональні дні-вихідні користувача в просторі (опційно — у діапазоні дат). */
export function useDayOffs(
  workspaceId: string | null,
  userId: string | null,
  fromISO?: string,
  toISO?: string,
) {
  return useQuery({
    queryKey: dayOffsKey(workspaceId, userId, fromISO, toISO),
    enabled: !!workspaceId && !!userId,
    queryFn: async (): Promise<DayOff[]> => {
      let query = supabase
        .from("day_offs")
        .select(SELECT)
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId!);
      if (fromISO) query = query.gte("date", fromISO);
      if (toISO) query = query.lte("date", toISO);
      const { data, error } = await query.order("date");
      if (error) throw error;
      return (data as DayOffRow[]).map(toDomain);
    },
  });
}

/**
 * Дні-вихідні користувача в усіх його просторах (для «Усі мої простори» у
 * звітах). RLS обмежує вибірку членством, тому фільтр за workspace не потрібен.
 */
export function useDayOffsAll(
  userId: string | null,
  fromISO: string,
  toISO: string,
) {
  return useQuery({
    queryKey: ["day-offs-all", userId, fromISO, toISO],
    enabled: !!userId,
    queryFn: async (): Promise<DayOff[]> => {
      const { data, error } = await supabase
        .from("day_offs")
        .select(SELECT)
        .eq("user_id", userId!)
        .gte("date", fromISO)
        .lte("date", toISO)
        .order("date");
      if (error) throw error;
      return (data as DayOffRow[]).map(toDomain);
    },
  });
}

export interface DayOffInput {
  workspaceId: string;
  userId: string;
  date: string;
  note: string | null;
}

/** Позначити (або оновити нотатку) день вихідним — upsert за унікальним ключем. */
export function useSetDayOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DayOffInput): Promise<DayOff> => {
      const { data, error } = await supabase
        .from("day_offs")
        .upsert(
          {
            workspace_id: input.workspaceId,
            user_id: input.userId,
            date: input.date,
            note: input.note?.trim() ? input.note.trim() : null,
          },
          { onConflict: "workspace_id,user_id,date" },
        )
        .select(SELECT)
        .single();
      if (error) throw error;
      return toDomain(data as DayOffRow);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["day-offs", input.workspaceId, input.userId],
      });
      qc.invalidateQueries({ queryKey: ["day-offs-all", input.userId] });
    },
  });
}

/** Зняти позначку вихідного дня. */
export function useRemoveDayOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      workspaceId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("day_offs")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ["day-offs", input.workspaceId, input.userId],
      });
      qc.invalidateQueries({ queryKey: ["day-offs-all", input.userId] });
    },
  });
}
