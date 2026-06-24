import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Label as LabelType, Project, TaskPriority, TaskStatus } from "@/types/domain";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  type TaskInput,
  type TaskWithLabels,
} from "@/queries/tasks";
import { useSetTaskLabels } from "@/queries/labels";
import { useTaskMinutes } from "@/queries/timeEntries";
import type { Member } from "@/queries/members";
import { formatHours } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabelPicker } from "./LabelPicker";
import { PRIORITIES, STATUSES, priorityLabelKey, statusLabelKey } from "./taskMeta";

const NO_PROJECT = "none";
const NO_ASSIGNEE = "none";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithLabels | null;
  projects: Project[];
  labels: LabelType[];
  members: Member[];
  workspaceId: string | null;
  userId: string | null;
  /** Початковий статус для нової задачі. */
  initialStatus?: TaskStatus;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  ...rest
}: TaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open && (
          <TaskForm
            key={task?.id ?? "new"}
            task={task}
            onClose={() => onOpenChange(false)}
            {...rest}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TaskFormProps {
  task: TaskWithLabels | null;
  projects: Project[];
  labels: LabelType[];
  members: Member[];
  workspaceId: string | null;
  userId: string | null;
  initialStatus?: TaskStatus;
  onClose: () => void;
}

function TaskForm({
  task,
  projects,
  labels,
  members,
  workspaceId,
  userId,
  initialStatus,
  onClose,
}: TaskFormProps) {
  const { t } = useTranslation();
  const isEdit = !!task;
  // Видалення задачі — лише owner/admin (UI-гейтинг; джерело істини — RLS).
  const myRole = members.find((m) => m.userId === userId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const create = useCreateTask(workspaceId, userId);
  const update = useUpdateTask(workspaceId);
  const remove = useDeleteTask(workspaceId);
  const setLabels = useSetTaskLabels(workspaceId);
  const { data: loggedMinutes } = useTaskMinutes(task?.id ?? null);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? NO_PROJECT);
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? initialStatus ?? "todo",
  );
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? NO_ASSIGNEE);
  const [labelIds, setLabelIds] = useState<string[]>(
    (task?.labels ?? []).map((l) => l.id),
  );

  const activeProjects = projects.filter(
    (p) => !p.isArchived || p.id === task?.projectId,
  );
  const canSave = title.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    const input: TaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      projectId: projectId === NO_PROJECT ? null : projectId,
      status,
      priority,
      dueDate: dueDate || null,
      assigneeId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
    };
    try {
      const id = isEdit
        ? (await update.mutateAsync({ id: task!.id, ...input }), task!.id)
        : await create.mutateAsync(input);
      await setLabels.mutateAsync({ taskId: id, labelIds });
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await remove.mutateAsync(task.id);
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? t("tasks.editTitle") : t("tasks.createTitle")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">{t("tasks.titleField")}</Label>
          <Input
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("tasks.project")}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>{t("tasks.noProject")}</SelectItem>
                {activeProjects.map((p) => (
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
          </div>
          <div className="space-y-2">
            <Label>{t("tasks.dueDate")}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("tasks.statusField")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(statusLabelKey[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("tasks.priorityField")}</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(priorityLabelKey[p])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("tasks.assignee")}</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ASSIGNEE}>{t("tasks.noAssignee")}</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.displayName ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("tasks.labels")}</Label>
          <LabelPicker
            workspaceId={workspaceId}
            labels={labels}
            selected={labelIds}
            onChange={setLabelIds}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-desc">{t("tasks.descriptionField")}</Label>
          <Textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {isEdit && loggedMinutes !== undefined && loggedMinutes > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("tasks.logged")}: {formatHours(loggedMinutes)} {t("common.hours")}
          </p>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        {isEdit && canManage ? (
          <Button variant="destructive" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
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
