import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

export function commentsKey(taskId: string | null) {
  return ["comments", taskId] as const;
}

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: commentsKey(taskId),
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select(
          "id, task_id, user_id, body, created_at, profiles(display_name)",
        )
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as CommentRow[]).map((c) => ({
        id: c.id,
        taskId: c.task_id,
        userId: c.user_id,
        body: c.body,
        createdAt: c.created_at,
        authorName: c.profiles?.display_name ?? null,
      }));
    },
  });
}

export function useAddComment(ctx: {
  taskId: string | null;
  workspaceId: string | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("task_comments").insert({
        task_id: ctx.taskId!,
        workspace_id: ctx.workspaceId!,
        user_id: ctx.userId!,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(ctx.taskId) });
    },
  });
}

export function useDeleteComment(taskId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(taskId) });
    },
  });
}
