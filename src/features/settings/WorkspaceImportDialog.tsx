import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  bundleCounts,
  isBundleParseError,
  parseBundle,
  type WorkspaceBundle,
} from "@/lib/workspaceTransfer";
import { useImportWorkspace, type TransferScope } from "@/queries/transfer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScopeCheckbox } from "./ScopeCheckbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  workspaceName: string;
  userId: string | null;
}

export function WorkspaceImportDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  userId,
}: Props) {
  const { t } = useTranslation();
  const importWs = useImportWorkspace(workspaceId, userId);
  const [bundle, setBundle] = useState<WorkspaceBundle | null>(null);
  const [fileName, setFileName] = useState("");
  const [scope, setScope] = useState<TransferScope>({
    projects: true,
    tasks: true,
    entries: true,
  });

  function reset() {
    setBundle(null);
    setFileName("");
    setScope({ projects: true, tasks: true, entries: true });
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseBundle(text);
      setBundle(parsed);
      const c = bundleCounts(parsed);
      setScope({
        projects: c.projects > 0,
        tasks: c.tasks > 0,
        entries: c.entries > 0,
      });
    } catch (e) {
      toast.error(
        isBundleParseError(e) ? t("transfer.badFile") : t("import.parseError"),
      );
      reset();
    }
  }

  async function handleImport() {
    if (!bundle) return;
    try {
      const r = await importWs.mutateAsync({ bundle, scope });
      toast.success(
        t("transfer.imported", {
          projects: r.projectsCreated,
          tasks: r.tasksCreated,
          entries: r.entriesCreated,
          skipped: r.entriesSkipped,
        }),
      );
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

  const counts = bundle ? bundleCounts(bundle) : null;
  const nothingSelected = !scope.projects && !scope.tasks && !scope.entries;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transfer.importTitle")}</DialogTitle>
          <DialogDescription>
            {t("transfer.importInto", { name: workspaceName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="file"
            accept=".json,application/json"
            className="cursor-pointer file:cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {bundle && counts && (
            <div className="space-y-3 rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {fileName}
                {bundle.workspaceName && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {bundle.workspaceName}
                  </span>
                )}
              </p>
              <div className="space-y-2">
                <ScopeCheckbox
                  label={t("transfer.projects", { count: counts.projects })}
                  checked={scope.projects || scope.tasks || scope.entries}
                  disabled={
                    counts.projects === 0 || scope.tasks || scope.entries
                  }
                  onChange={(v) => setScope((s) => ({ ...s, projects: v }))}
                />
                <ScopeCheckbox
                  label={t("transfer.tasks", { count: counts.tasks })}
                  checked={scope.tasks}
                  disabled={counts.tasks === 0}
                  onChange={(v) => setScope((s) => ({ ...s, tasks: v }))}
                />
                <ScopeCheckbox
                  label={t("transfer.timesheet", { count: counts.entries })}
                  checked={scope.entries}
                  disabled={counts.entries === 0}
                  onChange={(v) => setScope((s) => ({ ...s, entries: v }))}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!bundle || nothingSelected || importWs.isPending}
          >
            {importWs.isPending ? t("common.loading") : t("transfer.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
