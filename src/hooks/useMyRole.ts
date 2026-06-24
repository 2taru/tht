import { useAuth } from "@/features/auth/AuthProvider";
import { useMembers } from "@/queries/members";
import type { Role } from "@/types/domain";

/**
 * Роль поточного користувача в активному просторі + похідні прапорці прав.
 * Використовує кешований запит учасників (без додаткового фетчу).
 * УВАГА: це лише UI-гейтинг; справжній захист — RLS на БД.
 */
export function useMyRole(workspaceId: string | null) {
  const { user } = useAuth();
  const { data: members } = useMembers(workspaceId);
  const role: Role | null =
    members?.find((m) => m.userId === user?.id)?.role ?? null;
  return {
    role,
    isOwner: role === "owner",
    canManage: role === "owner" || role === "admin",
  };
}
