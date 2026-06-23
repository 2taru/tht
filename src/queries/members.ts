import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/domain";

export interface Member {
  id: string;
  userId: string;
  role: Role;
  displayName: string | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: Role;
  profiles: { display_name: string | null } | null;
}

export function membersKey(workspaceId: string | null) {
  return ["members", workspaceId] as const;
}

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: membersKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, profiles(display_name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as MemberRow[]).map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        displayName: m.profiles?.display_name ?? null,
      }));
    },
  });
}

/** Помилки rpc invite_member: 42501 — не дозволено, P0002 — користувача нема. */
export const INVITE_NOT_AUTHORIZED = "42501";
export const INVITE_USER_NOT_FOUND = "P0002";

export function useInviteMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: Role }) => {
      const { error } = await supabase.rpc("invite_member", {
        ws: workspaceId!,
        member_email: input.email,
        member_role: input.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });
}

export function useUpdateMemberRole(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role: Role }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: input.role })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });
}

export function useRemoveMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });
}
