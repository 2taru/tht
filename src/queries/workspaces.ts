import { useQuery } from "@tanstack/react-query";
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
