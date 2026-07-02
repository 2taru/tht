import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/domain";
import { invitesKey } from "./invites";

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

/** Помилки rpc invite_member: 42501 — не дозволено. */
export const INVITE_NOT_AUTHORIZED = "42501";

export function useInviteMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      role: Role;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc("invite_member", {
        ws: workspaceId!,
        member_email: input.email,
        member_role: input.role,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
      qc.invalidateQueries({ queryKey: invitesKey(workspaceId) });
    },
  });
}

export function useTransferOwnership(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newOwnerUserId: string) => {
      const { error } = await supabase.rpc("transfer_ownership", {
        ws: workspaceId!,
        new_owner: newOwnerUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
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

/** Вийти з простору: видаляємо ВЛАСНЕ членство (RLS дозволяє не-owner). */
export function useLeaveWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", input.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
