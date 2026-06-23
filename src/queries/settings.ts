import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserSettings } from "@/types/domain";

interface SettingsRow {
  user_id: string;
  day_start_minute: number;
  day_end_minute: number;
  grid_step_minutes: number;
  week_start: number;
  theme: string;
  locale: string;
}

function toDomain(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    dayStartMinute: row.day_start_minute,
    dayEndMinute: row.day_end_minute,
    gridStepMinutes: row.grid_step_minutes,
    weekStart: row.week_start,
    theme: row.theme,
    locale: row.locale,
  };
}

/** Налаштування поточного користувача (рядок створює тригер бутстрапу). */
export function useSettings(userId: string | null) {
  return useQuery({
    queryKey: ["settings", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "user_id, day_start_minute, day_end_minute, grid_step_minutes, week_start, theme, locale",
        )
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return toDomain(data as SettingsRow);
    },
  });
}
