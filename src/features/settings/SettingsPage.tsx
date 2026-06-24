import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import {
  useSettings,
  useUpdateSettings,
  type SettingsInput,
} from "@/queries/settings";
import { ImportDialog } from "./ImportDialog";
import { useProfile, useUpdateProfile, type Profile } from "@/queries/profile";
import type { UserSettings } from "@/types/domain";
import { minutesToTimeValue, timeValueToMinutes } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [15, 30, 60];
const CURRENCIES = ["UAH", "USD", "EUR", "PLN", "GBP"];

export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { workspace } = useActiveWorkspace();
  const { data: settings } = useSettings(userId);
  const { data: profile } = useProfile(userId);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      {!settings || !profile ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <SettingsForm
          key={userId}
          userId={userId}
          settings={settings}
          profile={profile}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("import.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("import.description")}
          </p>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            {t("import.run")}
          </Button>
        </CardContent>
      </Card>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspaceId={workspace?.id ?? null}
        userId={userId}
      />
    </div>
  );
}

interface SettingsFormProps {
  userId: string | null;
  settings: UserSettings;
  profile: Profile;
}

function SettingsForm({ userId, settings, profile }: SettingsFormProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const updateSettings = useUpdateSettings(userId);
  const updateProfile = useUpdateProfile(userId);

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [start, setStart] = useState(
    minutesToTimeValue(settings.dayStartMinute),
  );
  const [end, setEnd] = useState(minutesToTimeValue(settings.dayEndMinute));
  const [step, setStep] = useState(String(settings.gridStepMinutes));
  const [weekStart, setWeekStart] = useState(String(settings.weekStart));
  const [currency, setCurrency] = useState(settings.currency);

  const startMinute = timeValueToMinutes(start);
  const endMinute = timeValueToMinutes(end);
  const boundsOk = startMinute < endMinute;

  async function handleSave() {
    if (!boundsOk) return;
    const input: SettingsInput = {
      dayStartMinute: startMinute,
      dayEndMinute: endMinute,
      gridStepMinutes: Number(step),
      weekStart: Number(weekStart),
      currency,
    };
    try {
      await Promise.all([
        updateSettings.mutateAsync(input),
        updateProfile.mutateAsync({ displayName: displayName.trim() }),
      ]);
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">{t("settings.displayName")}</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.workday")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="day-start">{t("settings.dayStart")}</Label>
              <Input
                id="day-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="day-end">{t("settings.dayEnd")}</Label>
              <Input
                id="day-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          {!boundsOk && (
            <p className="text-sm text-destructive">
              {t("settings.boundsError")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("settings.gridStep")}</Label>
              <Select value={step} onValueChange={setStep}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEPS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} {t("settings.minutes")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.weekStart")}</Label>
              <Select value={weekStart} onValueChange={setWeekStart}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("settings.monday")}</SelectItem>
                  <SelectItem value="0">{t("settings.sunday")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("settings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("settings.light")}</SelectItem>
                <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                <SelectItem value="system">{t("settings.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!boundsOk}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
