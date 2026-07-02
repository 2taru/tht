import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { m } from "motion/react";
import { Bell } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveWorkspace, setActiveWorkspaceId } from "@/hooks/useActiveWorkspace";
import { useTasks } from "@/queries/tasks";
import { classifyDue, dueOrder, type DueStatus } from "@/lib/dueDate";
import { formatDateTime, fromISODate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUnreadNotifications,
  useMarkNotificationsRead,
} from "@/queries/notifications";

const dotClass: Record<Exclude<DueStatus, "none">, string> = {
  overdue: "bg-destructive",
  today: "bg-amber-500",
  soon: "bg-sky-500",
};

const SCOPE_KEY = "tht.notifyScope";
type Scope = "all" | "mine";

export function NotificationsBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useActiveWorkspace();
  const { data: tasks } = useTasks(workspace?.id ?? null);
  const { data: notifs } = useUnreadNotifications(user?.id ?? null);
  const markRead = useMarkNotificationsRead(user?.id ?? null);

  // Default "all" — у соло задачі зазвичай без виконавця, тож "mine" сховало б усе.
  const [scope, setScope] = useState<Scope>(
    () => (localStorage.getItem(SCOPE_KEY) as Scope) ?? "all",
  );
  function changeScope(next: Scope) {
    setScope(next);
    localStorage.setItem(SCOPE_KEY, next);
  }

  const items = useMemo(() => {
    const today = todayISO();
    return (tasks ?? [])
      .filter((tk) => tk.status !== "done" && tk.dueDate)
      .filter((tk) => scope === "all" || tk.assigneeId === user?.id)
      .map((tk) => ({ task: tk, due: classifyDue(tk.dueDate, today) }))
      .filter((x) => x.due !== "none")
      .sort(
        (a, b) =>
          dueOrder[a.due] - dueOrder[b.due] ||
          (a.task.dueDate ?? "").localeCompare(b.task.dueDate ?? ""),
      );
  }, [tasks, scope, user?.id]);

  const urgent = items.filter(
    (x) => x.due === "overdue" || x.due === "today",
  ).length;
  const count = (notifs?.length ?? 0) + items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("notifications.title")}
        >
          <Bell className="size-5" />
          {count > 0 && (
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={cn(
                "absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                urgent > 0 ? "bg-destructive" : "bg-sky-500",
              )}
            >
              {count > 9 ? "9+" : count}
            </m.span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {notifs && notifs.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>{t("notifications.events")}</span>
              <button
                type="button"
                className="text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  markRead.mutate(notifs.map((n) => n.id));
                }}
              >
                {t("notifications.markAllRead")}
              </button>
            </DropdownMenuLabel>
            {notifs.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => {
                  markRead.mutate([n.id]);
                  if (n.workspaceId !== workspace?.id) {
                    setActiveWorkspaceId(n.workspaceId);
                  }
                  navigate("/tasks?view=list");
                }}
                className="flex items-start gap-2"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {t("notifications.assigned")}: {n.title ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("notifications.deadlines")}</span>
          <div className="flex rounded-md border p-0.5">
            {(["all", "mine"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  changeScope(s);
                }}
                className={cn(
                  "rounded-sm px-2 py-0.5 text-xs font-normal transition-colors",
                  scope === s
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`notifications.scope.${s}`)}
              </button>
            ))}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            {(notifs?.length ?? 0) === 0
              ? t("notifications.empty")
              : t("notifications.emptyDeadlines")}
          </div>
        ) : (
          items.slice(0, 12).map(({ task, due }) => (
            <DropdownMenuItem
              key={task.id}
              onClick={() => navigate("/tasks?view=list")}
              className="flex items-start gap-2"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  dotClass[due as Exclude<DueStatus, "none">],
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t(`notifications.${due}`)} ·{" "}
                  {task.dueDate &&
                    format(fromISODate(task.dueDate), "d MMM", { locale: uk })}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
