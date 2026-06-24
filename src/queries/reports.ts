import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ReportRow {
  date: string;
  userId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectRate: number | null;
  taskTitle: string | null;
  description: string | null;
  minutes: number;
}

interface RawRow {
  entry_date: string;
  user_id: string;
  start_minute: number;
  end_minute: number;
  description: string | null;
  project_id: string;
  projects: { name: string; color: string; hourly_rate: number | string | null } | null;
  tasks: { title: string } | null;
}

/**
 * Записи часу за період (з назвами проєкту/задачі) для звітів.
 * `memberId`: конкретний user_id або null = усі учасники простору (RLS все одно
 * обмежує читання межами команди).
 */
export function useReportEntries(
  workspaceId: string | null,
  memberId: string | null,
  fromISO: string,
  toISO: string,
) {
  return useQuery({
    queryKey: ["report", workspaceId, memberId, fromISO, toISO],
    enabled: !!workspaceId,
    queryFn: async (): Promise<ReportRow[]> => {
      let q = supabase
        .from("time_entries")
        .select(
          "entry_date, user_id, start_minute, end_minute, description, project_id, projects(name, color, hourly_rate), tasks(title)",
        )
        .eq("workspace_id", workspaceId!)
        .gte("entry_date", fromISO)
        .lte("entry_date", toISO);
      if (memberId) q = q.eq("user_id", memberId);
      const { data, error } = await q
        .order("entry_date", { ascending: true })
        .order("start_minute", { ascending: true });
      if (error) throw error;
      return (data as unknown as RawRow[]).map((r) => ({
        date: r.entry_date,
        userId: r.user_id,
        projectId: r.project_id,
        projectName: r.projects?.name ?? "—",
        projectColor: r.projects?.color ?? "#64748b",
        projectRate:
          r.projects?.hourly_rate == null ? null : Number(r.projects.hourly_rate),
        taskTitle: r.tasks?.title ?? null,
        description: r.description,
        minutes: r.end_minute - r.start_minute,
      }));
    },
  });
}
