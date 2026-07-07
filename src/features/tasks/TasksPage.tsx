import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { m } from "motion/react";
import { Plus } from "lucide-react";
import { contentEnter } from "@/lib/motion";
import type { Project, TaskPriority, TaskStatus } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useProjects } from "@/queries/projects";
import { useLabels } from "@/queries/labels";
import { useMembers } from "@/queries/members";
import { useTasks, type TaskWithLabels } from "@/queries/tasks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskBoard } from "./TaskBoard";
import { TaskList, type SortKey } from "./TaskList";
import { TaskColumnsMenu } from "./TaskColumnsMenu";
import { useTaskColumns } from "./taskColumns";
import { TaskDialog } from "./TaskDialog";
import {
  PRIORITIES,
  STATUSES,
  priorityLabelKey,
  statusLabelKey,
} from "./taskMeta";

type View = "board" | "list";

export function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;

  const { data: tasks, isLoading } = useTasks(workspaceId);
  const { data: projects } = useProjects(workspaceId);
  const { data: labels } = useLabels(workspaceId);
  const { data: members } = useMembers(workspaceId);

  const membersById = useMemo(() => {
    const map = new Map<string, string>();
    (members ?? []).forEach((m) => map.set(m.userId, m.displayName ?? "—"));
    return map;
  }, [members]);

  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) ?? "board";

  const [assigneeF, setAssigneeF] = useState<string>("all");
  const [statusF, setStatusF] = useState<TaskStatus | "all">("all");
  const [priorityF, setPriorityF] = useState<TaskPriority | "all">("all");
  const [projectF, setProjectF] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const { columns, toggle: toggleColumn } = useTaskColumns();

  const visibleTasks = useMemo(() => {
    return (tasks ?? []).filter((tk) => {
      if (assigneeF === "none" && tk.assigneeId) return false;
      if (assigneeF !== "all" && assigneeF !== "none" && tk.assigneeId !== assigneeF)
        return false;
      if (statusF !== "all" && tk.status !== statusF) return false;
      if (priorityF !== "all" && tk.priority !== priorityF) return false;
      if (projectF !== "all" && tk.projectId !== projectF) return false;
      return true;
    });
  }, [tasks, assigneeF, statusF, priorityF, projectF]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithLabels | null>(null);

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>();
    (projects ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  function setView(next: View) {
    const p = new URLSearchParams(params);
    p.set("view", next);
    setParams(p, { replace: true });
  }
  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(task: TaskWithLabels) {
    setEditing(task);
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("tasks.title")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {(members?.length ?? 0) > 1 && (
              <Select value={assigneeF} onValueChange={setAssigneeF}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("tasks.allAssignees")}</SelectItem>
                  <SelectItem value="none">{t("tasks.noAssignee")}</SelectItem>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.displayName ?? "—"}
                      {m.userId === userId ? ` (${t("team.you")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="board">{t("tasks.board")}</TabsTrigger>
                <TabsTrigger value="list">{t("tasks.list")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("tasks.new")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={statusF}
            onChange={(v) => setStatusF(v as TaskStatus | "all")}
            allLabel={t("tasks.allStatuses")}
            options={STATUSES.map((s) => ({
              value: s,
              label: t(statusLabelKey[s]),
            }))}
          />
          <FilterSelect
            value={priorityF}
            onChange={(v) => setPriorityF(v as TaskPriority | "all")}
            allLabel={t("tasks.allPriorities")}
            options={PRIORITIES.map((p) => ({
              value: p,
              label: t(priorityLabelKey[p]),
            }))}
          />
          <FilterSelect
            value={projectF}
            onChange={setProjectF}
            allLabel={t("tasks.allProjects")}
            options={(projects ?? []).map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {view === "list" && (
            <>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="ml-auto w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">
                    {t("tasks.sortPriority")}
                  </SelectItem>
                  <SelectItem value="dueDate">{t("tasks.sortDue")}</SelectItem>
                  <SelectItem value="title">{t("tasks.sortTitle")}</SelectItem>
                </SelectContent>
              </Select>
              <TaskColumnsMenu columns={columns} onToggle={toggleColumn} />
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "board" ? (
        // Дошка — робоча поверхня фіксованої висоти: колонки скролять всередині.
        <m.div
          key="board"
          {...contentEnter}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TaskBoard
            tasks={visibleTasks}
            projectsById={projectsById}
            membersById={membersById}
            workspaceId={workspaceId}
            onCardClick={openEdit}
          />
        </m.div>
      ) : (
        // Список скролить у власній області (обидві осі), заголовок сторінки
        // лишається зверху як звичайний flex-рядок.
        <m.div key="list" {...contentEnter} className="min-h-0 flex-1 overflow-auto">
          <TaskList
            tasks={visibleTasks}
            projectsById={projectsById}
            membersById={membersById}
            sort={sort}
            columns={columns}
            onRowClick={openEdit}
          />
        </m.div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        projects={projects ?? []}
        labels={labels ?? []}
        members={members ?? []}
        workspaceId={workspaceId}
        userId={userId}
      />
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
