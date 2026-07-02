import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { QueryKey } from "@tanstack/react-query";
import type { Project } from "@/types/domain";
import type { TaskWithLabels } from "@/queries/tasks";
import {
  OVERLAP_VIOLATION,
  useCreateEntry,
  useDeleteEntry,
  useUpdateEntry,
  type EntryInput,
} from "@/queries/timeEntries";
import {
  formatHours,
  minutesToTimeValue,
  timeValueToMinutes,
} from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Чернетка нового запису (з drag) або наявний запис для редагування. */
export interface EntryDraft {
  id?: string;
  entryDate: string;
  startMinute: number;
  endMinute: number;
  projectId?: string;
  taskId?: string | null;
  description?: string | null;
}

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: EntryDraft | null;
  projects: Project[];
  tasks: TaskWithLabels[];
  workspaceId: string | null;
  userId: string | null;
  queryKey: QueryKey;
  onDuplicate: (draft: EntryDraft) => void;
}

export function EntryDialog({
  open,
  onOpenChange,
  draft,
  ...rest
}: EntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {draft && (
          <EntryForm
            key={draft.id ?? `new-${draft.entryDate}-${draft.startMinute}`}
            draft={draft}
            onClose={() => onOpenChange(false)}
            {...rest}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EntryFormProps {
  draft: EntryDraft;
  projects: Project[];
  tasks: TaskWithLabels[];
  workspaceId: string | null;
  userId: string | null;
  queryKey: QueryKey;
  onClose: () => void;
  onDuplicate: (draft: EntryDraft) => void;
}

const NO_TASK = "none";

function EntryForm({
  draft,
  projects,
  tasks,
  workspaceId,
  userId,
  queryKey,
  onClose,
  onDuplicate,
}: EntryFormProps) {
  const { t } = useTranslation();
  const ctx = { workspaceId, userId, queryKey };
  const create = useCreateEntry(ctx);
  const update = useUpdateEntry(ctx);
  const remove = useDeleteEntry(ctx);

  const isEdit = !!draft.id;
  const [projectId, setProjectId] = useState(draft.projectId ?? "");
  const [taskId, setTaskId] = useState(draft.taskId ?? NO_TASK);
  const [description, setDescription] = useState(draft.description ?? "");
  const [start, setStart] = useState(minutesToTimeValue(draft.startMinute));
  const [end, setEnd] = useState(minutesToTimeValue(draft.endMinute));

  // Задачі обраного проєкту (без виконаних) + поточна задача запису,
  // навіть якщо вона з іншого проєкту чи вже виконана.
  const projectTasks = tasks.filter(
    (tk) =>
      (tk.projectId === projectId && tk.status !== "done") ||
      tk.id === draft.taskId,
  );

  const startMinute = timeValueToMinutes(start);
  const endMinute = timeValueToMinutes(end);
  const durationOk = endMinute > startMinute;
  const canSave = !!projectId && durationOk;

  // Активні проєкти + поточний (раптом архівний) для коректного select.
  const options = projects.filter(
    (p) => !p.isArchived || p.id === draft.projectId,
  );

  async function handleSave() {
    if (!canSave) return;
    const input: EntryInput = {
      projectId,
      taskId: taskId === NO_TASK ? null : taskId,
      entryDate: draft.entryDate,
      startMinute,
      endMinute,
      description: description.trim() || null,
    };
    try {
      if (isEdit && draft.id) {
        await update.mutateAsync({ id: draft.id, ...input });
      } else {
        await create.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(
        code === OVERLAP_VIOLATION ? t("errors.overlap") : t("common.error"),
      );
    }
  }

  async function handleDelete() {
    if (!draft.id) return;
    try {
      await remove.mutateAsync(draft.id);
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  }

  function handleDuplicate() {
    onDuplicate({
      entryDate: draft.entryDate,
      startMinute,
      endMinute,
      projectId: projectId || undefined,
      taskId: taskId === NO_TASK ? null : taskId,
      description: description.trim() || null,
    });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? t("timesheet.editEntry") : t("timesheet.newEntry")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("timesheet.project")}</Label>
          {options.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {t("timesheet.noProjectsHint")}{" "}
              <Link to="/projects" className="text-foreground underline">
                {t("timesheet.goToProjects")}
              </Link>
            </p>
          ) : (
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("timesheet.selectProject")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("timesheet.task")}</Label>
          <SearchableSelect
            value={projectTasks.some((tk) => tk.id === taskId) ? taskId : null}
            onValueChange={setTaskId}
            onClear={() => setTaskId(NO_TASK)}
            disabled={!projectId}
            placeholder={t("timesheet.noTask")}
            searchPlaceholder={t("timesheet.searchTask")}
            emptyText={t("timesheet.noTaskFound")}
            options={projectTasks.map((tk) => ({
              value: tk.id,
              label: tk.title,
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="entry-start">{t("timesheet.start")}</Label>
            <Input
              id="entry-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-end">{t("timesheet.end")}</Label>
            <Input
              id="entry-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        {!durationOk && (
          <p className="text-sm text-destructive">{t("timesheet.badRange")}</p>
        )}
        {durationOk && (
          <p className="text-sm text-muted-foreground">
            {t("timesheet.duration")}: {formatHours(endMinute - startMinute)}{" "}
            {t("common.hours")}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="entry-desc">{t("timesheet.description")}</Label>
          <Textarea
            id="entry-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        {isEdit ? (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={!canSave}
            >
              <Copy className="size-4" />
              {t("timesheet.duplicate")}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {t("common.save")}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
