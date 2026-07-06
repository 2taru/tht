import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import {
  bundleFilename,
  downloadJson,
  type WorkspaceBundle,
} from "@/lib/workspaceTransfer";
import {
  useExportWorkspace,
  type TransferRange,
  type TransferScope,
} from "@/queries/transfer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScopeCheckbox } from "./ScopeCheckbox";
import { WorkspaceImportDialog } from "./WorkspaceImportDialog";

interface Props {
  workspaceId: string | null;
  workspaceName: string;
  userId: string | null;
}

export function TransferCard({ workspaceId, workspaceName, userId }: Props) {
  const { t } = useTranslation();
  const exportWs = useExportWorkspace(workspaceId);
  const [importOpen, setImportOpen] = useState(false);
  const [scope, setScope] = useState<TransferScope>({
    projects: true,
    tasks: true,
    entries: true,
  });
  const [range, setRange] = useState<TransferRange>({ from: null, to: null });

  const rangeInvalid = !!range.from && !!range.to && range.from > range.to;
  // Діапазон стосується лише задач/таймшита; без них він ні на що не впливає.
  const rangeApplies = scope.tasks || scope.entries;

  async function handleExport() {
    try {
      const bundle: WorkspaceBundle = await exportWs.mutateAsync({
        workspaceName,
        scope,
        range,
      });
      downloadJson(bundleFilename(workspaceName), bundle);
      toast.success(
        t("transfer.exported", {
          projects: bundle.projects.length,
          tasks: bundle.tasks.length,
          entries: bundle.entries.length,
        }),
      );
    } catch {
      toast.error(t("common.error"));
    }
  }

  const nothingSelected = !scope.projects && !scope.tasks && !scope.entries;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("transfer.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t("transfer.description")}
        </p>

        {/* Експорт */}
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("transfer.exportTitle")}</p>
          <div className="space-y-2">
            <ScopeCheckbox
              label={t("transfer.projectsShort")}
              checked={scope.projects || scope.tasks || scope.entries}
              disabled={scope.tasks || scope.entries}
              onChange={(v) => setScope((s) => ({ ...s, projects: v }))}
            />
            <ScopeCheckbox
              label={t("transfer.tasksShort")}
              checked={scope.tasks}
              onChange={(v) => setScope((s) => ({ ...s, tasks: v }))}
            />
            <ScopeCheckbox
              label={t("transfer.timesheetShort")}
              checked={scope.entries}
              onChange={(v) => setScope((s) => ({ ...s, entries: v }))}
            />
          </div>

          {/* Діапазон дат (опційно) — фільтрує задачі/таймшит. */}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t("transfer.rangeTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("transfer.rangeHint")}
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label htmlFor="export-from" className="text-xs">
                  {t("transfer.rangeFrom")}
                </Label>
                <Input
                  id="export-from"
                  type="date"
                  className="w-40"
                  value={range.from ?? ""}
                  max={range.to ?? undefined}
                  disabled={!rangeApplies}
                  onChange={(e) =>
                    setRange((r) => ({ ...r, from: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="export-to" className="text-xs">
                  {t("transfer.rangeTo")}
                </Label>
                <Input
                  id="export-to"
                  type="date"
                  className="w-40"
                  value={range.to ?? ""}
                  min={range.from ?? undefined}
                  disabled={!rangeApplies}
                  onChange={(e) =>
                    setRange((r) => ({ ...r, to: e.target.value || null }))
                  }
                />
              </div>
            </div>
            {rangeInvalid && (
              <p className="text-xs text-destructive">
                {t("transfer.rangeInvalid")}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={
              !workspaceId ||
              nothingSelected ||
              rangeInvalid ||
              exportWs.isPending
            }
          >
            <Download className="size-4" />
            {exportWs.isPending ? t("common.loading") : t("transfer.export")}
          </Button>
        </div>

        {/* Імпорт */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">{t("transfer.importTitle")}</p>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            {t("transfer.import")}
          </Button>
        </div>
      </CardContent>

      <WorkspaceImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        userId={userId}
      />
    </Card>
  );
}
