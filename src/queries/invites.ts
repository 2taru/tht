import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/domain";

export interface Invite {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function invitesKey(workspaceId: string | null) {
  return ["invites", workspaceId] as const;
}

export function useInvites(workspaceId: string | null) {
  return useQuery({
    queryKey: invitesKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("id, email, role, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role as Role,
        createdAt: row.created_at,
      }));
    },
  });
}

export function useCancelInvite(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_invites")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitesKey(workspaceId) });
    },
  });
}
