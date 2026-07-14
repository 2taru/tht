import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  currency: string;
  work_day_minutes: number;
  work_days: number[];
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
    currency: row.currency,
    workDayMinutes: row.work_day_minutes,
    workDays: row.work_days,
  };
}

export function settingsKey(userId: string | null) {
  return ["settings", userId] as const;
}

/** Налаштування поточного користувача (рядок створює тригер бутстрапу). */
export function useSettings(userId: string | null) {
  return useQuery({
    queryKey: settingsKey(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "user_id, day_start_minute, day_end_minute, grid_step_minutes, week_start, theme, locale, currency, work_day_minutes, work_days",
        )
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return toDomain(data as SettingsRow);
    },
  });
}

export interface SettingsInput {
  dayStartMinute: number;
  dayEndMinute: number;
  gridStepMinutes: number;
  weekStart: number;
  currency: string;
  workDayMinutes: number;
  workDays: number[];
}

export function useUpdateSettings(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettingsInput) => {
      const { error } = await supabase
        .from("user_settings")
        .update({
          day_start_minute: input.dayStartMinute,
          day_end_minute: input.dayEndMinute,
          grid_step_minutes: input.gridStepMinutes,
          week_start: input.weekStart,
          currency: input.currency,
          work_day_minutes: input.workDayMinutes,
          work_days: input.workDays,
        })
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKey(userId) });
    },
  });
}
