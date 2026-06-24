import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/domain";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<Workspace[]> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, owner_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        ownerId: w.owner_id,
      }));
    },
  });
}

export function useCreateWorkspace(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Workspace> => {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name, owner_id: userId! })
        .select("id, name, owner_id")
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, ownerId: data.owner_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase
        .from("workspaces")
        .update({ name: input.name })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

/** Видалити простір (лише owner — RLS). Каскадом зносить проєкти/задачі/записи. */
export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
