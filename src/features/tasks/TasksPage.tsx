import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { Project } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useProjects } from "@/queries/projects";
import { useLabels } from "@/queries/labels";
import { useTasks, type TaskWithLabels } from "@/queries/tasks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskBoard } from "./TaskBoard";
import { TaskList } from "./TaskList";
import { TaskDialog } from "./TaskDialog";

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

  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) ?? "board";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("tasks.title")}</h1>
        <div className="flex items-center gap-3">
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

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "board" ? (
        <TaskBoard
          tasks={tasks ?? []}
          projectsById={projectsById}
          workspaceId={workspaceId}
          onCardClick={openEdit}
        />
      ) : (
        <TaskList
          tasks={tasks ?? []}
          projects={projects ?? []}
          projectsById={projectsById}
          onRowClick={openEdit}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        projects={projects ?? []}
        labels={labels ?? []}
        workspaceId={workspaceId}
        userId={userId}
      />
    </div>
  );
}
