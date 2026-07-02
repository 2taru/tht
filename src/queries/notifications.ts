import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AppNotification {
  id: string;
  workspaceId: string;
  taskId: string | null;
  title: string | null;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  workspace_id: string;
  task_id: string | null;
  payload: { title?: string } | null;
  created_at: string;
}

export function notificationsKey(userId: string | null) {
  return ["notifications", userId] as const;
}

export function useUnreadNotifications(userId: string | null) {
  return useQuery({
    queryKey: notificationsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, workspace_id, task_id, payload, created_at")
        .eq("user_id", userId!)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown as NotificationRow[]).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        taskId: row.task_id,
        title: row.payload?.title ?? null,
        createdAt: row.created_at,
      }));
    },
  });
}

export function useMarkNotificationsRead(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsKey(userId) });
    },
  });
}
