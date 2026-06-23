import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function profileKey(userId: string | null) {
  return ["profile", userId] as const;
}

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
      };
    },
  });
}

export function useUpdateProfile(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { displayName: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: input.displayName })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKey(userId) });
    },
  });
}
