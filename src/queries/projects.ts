import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/domain";

interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  is_archived: boolean;
  hourly_rate: number | string | null;
}

function toDomain(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    isArchived: row.is_archived,
    hourlyRate: row.hourly_rate == null ? null : Number(row.hourly_rate),
  };
}

const SELECT = "id, workspace_id, name, color, is_archived, hourly_rate";

export function projectsKey(workspaceId: string | null) {
  return ["projects", workspaceId] as const;
}

/** Усі проєкти workspace (активні + архівні). Фільтрацію робимо в UI. */
export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: projectsKey(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(SELECT)
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as ProjectRow[]).map(toDomain);
    },
  });
}

export interface ProjectInput {
  name: string;
  color: string;
  hourlyRate: number | null;
}

export function useCreateProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: workspaceId!,
          name: input.name,
          color: input.color,
          hourly_rate: input.hourlyRate,
        })
        .select(SELECT)
        .single();
      if (error) throw error;
      return toDomain(data as ProjectRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
    },
  });
}

export function useUpdateProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ProjectInput & { id: string },
    ): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .update({
          name: input.name,
          color: input.color,
          hourly_rate: input.hourlyRate,
        })
        .eq("id", input.id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return toDomain(data as ProjectRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
    },
  });
}

export function useSetProjectArchived(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ is_archived: input.isArchived })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
    },
  });
}

/** Код помилки FK-обмеження (є записи часу) — діалог пропонує архівувати. */
export const FK_VIOLATION = "23503";

export function useDeleteProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
    },
  });
}
