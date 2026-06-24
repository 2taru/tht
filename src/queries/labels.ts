import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Label } from "@/types/domain";
import { tasksKey } from "./tasks";

interface LabelRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

function toDomain(row: LabelRow): Label {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
  };
}

export function labelsKey(workspaceId: string | null) {
  return ["labels", workspaceId] as const;
}

export function useLabels(workspaceId: string | null) {
  return useQuery({
    queryKey: labelsKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Label[]> => {
      const { data, error } = await supabase
        .from("labels")
        .select("id, workspace_id, name, color")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as LabelRow[]).map(toDomain);
    },
  });
}

export function useCreateLabel(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      color: string;
    }): Promise<Label> => {
      const { data, error } = await supabase
        .from("labels")
        .insert({
          workspace_id: workspaceId!,
          name: input.name,
          color: input.color,
        })
        .select("id, workspace_id, name, color")
        .single();
      if (error) throw error;
      return toDomain(data as LabelRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labelsKey(workspaceId) });
    },
  });
}

/** Замінює повний набір тегів задачі на заданий (delete-all + insert). */
export function useSetTaskLabels(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskId: string; labelIds: string[] }) => {
      const { error: delErr } = await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", input.taskId);
      if (delErr) throw delErr;
      if (input.labelIds.length > 0) {
        const { error: insErr } = await supabase.from("task_labels").insert(
          input.labelIds.map((labelId) => ({
            task_id: input.taskId,
            label_id: labelId,
          })),
        );
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKey(workspaceId) });
    },
  });
}
