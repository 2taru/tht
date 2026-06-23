import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { parseEntriesFile, type ParseResult } from "@/lib/importParse";
import { useImportEntries } from "@/queries/import";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  userId: string | null;
}

export function ImportDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const importEntries = useImportEntries(workspaceId, userId);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  function reset() {
    setParsed(null);
    setFileName("");
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setParsing(true);
    try {
      const result = await parseEntriesFile(file);
      setParsed(result);
    } catch {
      toast.error(t("import.parseError"));
      reset();
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    try {
      const res = await importEntries.mutateAsync(parsed.rows);
      toast.success(
        t("import.done", {
          created: res.created,
          skipped: res.skipped,
          projects: res.projectsCreated,
        }),
      );
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

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
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.formatHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {parsing && (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}

          {parsed && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{fileName}</p>
              <p className="text-muted-foreground">
                {t("import.validRows", { count: parsed.rows.length })}
                {parsed.invalid > 0 &&
                  ` · ${t("import.invalidRows", { count: parsed.invalid })}`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.rows.length === 0 || importEntries.isPending}
          >
            {importEntries.isPending ? t("common.loading") : t("import.run")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
