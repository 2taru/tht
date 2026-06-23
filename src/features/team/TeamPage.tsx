import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import {
  INVITE_USER_NOT_FOUND,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/queries/members";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLES: Role[] = ["member", "admin", "owner"];

export function TeamPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? null;
  const { data: members, isLoading } = useMembers(workspaceId);
  const invite = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const myRole = members?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      await invite.mutateAsync({ email: trimmed, role: inviteRole });
      setEmail("");
      toast.success(t("team.invited"));
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(
        code === INVITE_USER_NOT_FOUND ? t("team.userNotFound") : t("common.error"),
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("team.role.member")}</SelectItem>
                  <SelectItem value="admin">{t("team.role.admin")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={!email.trim()}>
                <UserPlus className="size-4" />
                {t("team.inviteBtn")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("team.inviteHint")}</p>
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
            members?.map((m) => {
              const isOwner = m.role === "owner";
              const isSelf = m.userId === user?.id;
              const name = m.displayName ?? "—";
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="size-8">
                    <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">
                    {name}
                    {isSelf && (
                      <span className="ml-1 text-muted-foreground">({t("team.you")})</span>
                    )}
                  </span>
                  {canManage && !isOwner ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        updateRole.mutate({ id: m.id, role: v as Role })
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
                    <Badge variant="secondary">{t(`team.role.${m.role}`)}</Badge>
                  )}
                  {canManage && !isOwner && !isSelf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember.mutate(m.id)}
                      aria-label={t("common.delete")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
