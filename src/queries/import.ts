import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ParsedRow } from "@/lib/importParse";
import { OVERLAP_VIOLATION } from "./timeEntries";
import { projectsKey } from "./projects";

export interface ImportResult {
  created: number;
  skipped: number;
  projectsCreated: number;
}

/**
 * Імпорт записів часу: резолвить проєкти за назвою (відсутні створює),
 * вставляє записи, пропускаючи перетини (23P01).
 */
export function useImportEntries(
  workspaceId: string | null,
  userId: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ParsedRow[]): Promise<ImportResult> => {
      const { data: projs, error: pErr } = await supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", workspaceId!);
      if (pErr) throw pErr;

      const byName = new Map<string, string>();
      (projs ?? []).forEach((p) => byName.set(p.name.toLowerCase(), p.id));

      // Автостворення відсутніх проєктів (дедуп за регістром, щоб не плодити дублі).
      let projectsCreated = 0;
      const seen = new Set<string>();
      const missing: string[] = [];
      for (const r of rows) {
        const lower = r.projectName.toLowerCase();
        if (!byName.has(lower) && !seen.has(lower)) {
          seen.add(lower);
          missing.push(r.projectName);
        }
      }
      for (const name of missing) {
        const { data, error } = await supabase
          .from("projects")
          .insert({ workspace_id: workspaceId!, name })
          .select("id")
          .single();
        if (error) throw error;
        byName.set(name.toLowerCase(), data.id);
        projectsCreated++;
      }

      let created = 0;
      let skipped = 0;
      for (const r of rows) {
        const projectId = byName.get(r.projectName.toLowerCase())!;
        const { error } = await supabase.from("time_entries").insert({
          workspace_id: workspaceId!,
          user_id: userId!,
          project_id: projectId,
          entry_date: r.date,
          start_minute: r.startMinute,
          end_minute: r.endMinute,
          description: r.description,
        });
        if (error) {
          if (error.code === OVERLAP_VIOLATION) skipped++;
          else throw error;
        } else {
          created++;
        }
      }
      return { created, skipped, projectsCreated };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKey(workspaceId) });
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["report"] });
    },
  });
}
