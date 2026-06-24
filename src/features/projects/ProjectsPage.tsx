import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { Project } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useMyRole } from "@/hooks/useMyRole";
import { useProjects } from "@/queries/projects";
import { useSettings } from "@/queries/settings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectRow } from "./ProjectRow";
import { ProjectDialog } from "./ProjectDialog";

export function ProjectsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { data: projects, isLoading, isError } = useProjects(workspaceId);
  const { data: settings } = useSettings(user?.id ?? null);
  const currency = settings?.currency ?? "UAH";
  const { canManage } = useMyRole(workspaceId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const { active, archived } = useMemo(() => {
    const list = projects ?? [];
    return {
      active: list.filter((p) => !p.isArchived),
      archived: list.filter((p) => p.isArchived),
    };
  }, [projects]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("projects.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t("projects.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError ? (
        <p className="text-destructive">{t("common.error")}</p>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              {t("projects.active")} ({active.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              {t("projects.archived")} ({archived.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-2">
            {active.length === 0 ? (
              <EmptyState message={t("projects.emptyActive")} />
            ) : (
              active.map((p) => (
                <ProjectRow
                  key={p.id}
                  workspaceId={workspaceId}
                  project={p}
                  currency={currency}
                  canManage={canManage}
                  onEdit={openEdit}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-2">
            {archived.length === 0 ? (
              <EmptyState message={t("projects.emptyArchived")} />
            ) : (
              archived.map((p) => (
                <ProjectRow
                  key={p.id}
                  workspaceId={workspaceId}
                  project={p}
                  currency={currency}
                  canManage={canManage}
                  onEdit={openEdit}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <ProjectDialog
        workspaceId={workspaceId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      {message}
    </div>
  );
}
