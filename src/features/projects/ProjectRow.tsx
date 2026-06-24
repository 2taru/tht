import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types/domain";
import { formatMoney } from "@/lib/money";
import {
  FK_VIOLATION,
  useDeleteProject,
  useSetProjectArchived,
} from "@/queries/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectRowProps {
  workspaceId: string | null;
  project: Project;
  currency: string;
  /** Видалення проєкту доступне лише owner/admin. */
  canManage: boolean;
  onEdit: (project: Project) => void;
}

export function ProjectRow({
  workspaceId,
  project,
  currency,
  canManage,
  onEdit,
}: ProjectRowProps) {
  const { t } = useTranslation();
  const setArchived = useSetProjectArchived(workspaceId);
  const remove = useDeleteProject(workspaceId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleArchiveToggle() {
    try {
      await setArchived.mutateAsync({
        id: project.id,
        isArchived: !project.isArchived,
      });
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(project.id);
      setConfirmOpen(false);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === FK_VIOLATION) {
        toast.error(t("projects.deleteBlocked"));
      } else {
        toast.error(t("common.error"));
      }
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span
        className="size-4 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <button
        type="button"
        onClick={() => onEdit(project)}
        className="min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {project.name}
      </button>
      {project.hourlyRate != null && (
        <span className="shrink-0 text-sm text-muted-foreground">
          {formatMoney(project.hourlyRate, currency)}/{t("common.hourShort")}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("common.actions")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(project)}>
            <Pencil className="size-4" />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchiveToggle}>
            {project.isArchived ? (
              <>
                <ArchiveRestore className="size-4" />
                {t("projects.unarchive")}
              </>
            ) : (
              <>
                <Archive className="size-4" />
                {t("projects.archive")}
              </>
            )}
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("projects.deleteConfirm", { name: project.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
