import { useState } from "react";
import { useTranslation } from "react-i18next";
import { m } from "motion/react";
import { Crown, LogOut, Trash2, UserPlus, X } from "lucide-react";
import { listItem } from "@/lib/motion";
import { toast } from "sonner";
import type { Role } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import {
  useInviteMember,
  useLeaveWorkspace,
  useMembers,
  useRemoveMember,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@/queries/members";
import { useCancelInvite, useInvites } from "@/queries/invites";
import { useDeleteWorkspace, useRenameWorkspace } from "@/queries/workspaces";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLES: Role[] = ["member", "admin", "owner"];

export function TeamPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { workspace, selectWorkspace, workspaces } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { data: members, isLoading } = useMembers(workspaceId);
  const { data: invites } = useInvites(workspaceId);
  const invite = useInviteMember(workspaceId);
  const cancelInvite = useCancelInvite(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const transferOwn = useTransferOwnership(workspaceId);
  const renameWs = useRenameWorkspace();
  const deleteWs = useDeleteWorkspace();
  const leaveWs = useLeaveWorkspace();

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const myRole = members?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  // Після виходу/видалення активного простору перемикаємось на інший наявний.
  function switchAway() {
    const next = workspaces.find((w) => w.id !== workspaceId);
    if (next) selectWorkspace(next.id);
  }

  async function handleRename(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !workspaceId || trimmed === workspace?.name) return;
    try {
      await renameWs.mutateAsync({ id: workspaceId, name: trimmed });
      toast.success(t("team.renamed"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleLeave() {
    if (!workspaceId || !user?.id) return;
    try {
      await leaveWs.mutateAsync({ workspaceId, userId: user.id });
      switchAway();
      toast.success(t("team.left"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleDelete() {
    if (!workspaceId) return;
    try {
      await deleteWs.mutateAsync(workspaceId);
      switchAway();
      toast.success(t("team.deleted"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const res = await invite.mutateAsync({
        email: trimmed,
        role: inviteRole,
      });
      setEmail("");
      toast.success(
        res === "invited" ? t("team.invitedPending") : t("team.invited"),
      );
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("team.title")}</h1>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("team.invite")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="invite-email">{t("team.email")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleInvite();
                    }
                  }}
                />
              </div>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as Role)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    {t("team.role.member")}
                  </SelectItem>
                  <SelectItem value="admin">{t("team.role.admin")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={!email.trim()}>
                <UserPlus className="size-4" />
                {t("team.inviteBtn")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("team.inviteHint")}
            </p>
            {invites && invites.length > 0 && (
              <>
                <p className="mt-4 mb-2 text-sm font-medium">
                  {t("team.pendingTitle")}
                </p>
                {invites.map((inv, i) => (
                  <m.div
                    key={inv.id}
                    {...listItem(i)}
                    className="flex items-center gap-3 rounded-lg border border-dashed p-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {inv.email}
                    </span>
                    <Badge variant="secondary">
                      {t(`team.role.${inv.role}`)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("team.cancelInvite")}
                      onClick={() =>
                        cancelInvite.mutate(inv.id, {
                          onSuccess: () =>
                            toast.success(t("team.inviteCanceled")),
                          onError: () => toast.error(t("common.error")),
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </m.div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("team.members")} {members ? `(${members.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            members?.map((mem, i) => {
              const isOwnerRow = mem.role === "owner";
              const isSelf = mem.userId === user?.id;
              const name = mem.displayName ?? "—";
              return (
                <m.div
                  key={mem.id}
                  {...listItem(i)}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Avatar className="size-8">
                    <AvatarFallback>
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">
                    {name}
                    {isSelf && (
                      <span className="ml-1 text-muted-foreground">
                        ({t("team.you")})
                      </span>
                    )}
                  </span>
                  {canManage && !isOwnerRow ? (
                    <Select
                      value={mem.role}
                      onValueChange={(v) =>
                        updateRole.mutate(
                          { id: mem.id, role: v as Role },
                          { onError: () => toast.error(t("common.error")) },
                        )
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => r !== "owner").map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`team.role.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">
                      {t(`team.role.${mem.role}`)}
                    </Badge>
                  )}
                  {isOwner && !isSelf && !isOwnerRow && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("team.transferOwnership")}
                          title={t("team.transferOwnership")}
                        >
                          <Crown className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("team.transferOwnership")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("team.transferConfirm", {
                              name,
                              ws: workspace?.name ?? "",
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("common.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await transferOwn.mutateAsync(mem.userId);
                                toast.success(t("team.transferred"));
                              } catch {
                                toast.error(t("common.error"));
                              }
                            }}
                          >
                            {t("team.transferOwnership")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {canManage && !isOwnerRow && !isSelf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeMember.mutate(mem.id, {
                          onError: () => toast.error(t("common.error")),
                        })
                      }
                      aria-label={t("common.delete")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </m.div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("team.settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <RenameForm
              key={workspaceId}
              initialName={workspace?.name ?? ""}
              onSave={handleRename}
            />
          )}

          <div className="flex flex-wrap gap-2">
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <LogOut className="size-4" />
                    {t("team.leave")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("team.leave")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("team.leaveConfirm", { name: workspace?.name ?? "" })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeave}>
                      {t("team.leave")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {isOwner && workspaces.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="size-4" />
                    {t("team.deleteWorkspace")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("team.deleteWorkspace")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("team.deleteConfirm", { name: workspace?.name ?? "" })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Поле ренейму простору. Keyed по workspaceId — стан скидається при перемиканні. */
function RenameForm({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialName);
  const dirty = value.trim().length > 0 && value.trim() !== initialName;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label htmlFor="ws-rename">{t("workspace.name")}</Label>
        <Input
          id="ws-rename"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (dirty) onSave(value);
            }
          }}
        />
      </div>
      <Button onClick={() => onSave(value)} disabled={!dirty}>
        {t("team.rename")}
      </Button>
    </div>
  );
}
