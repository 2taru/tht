import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { m } from "motion/react";
import { Bell } from "lucide-react";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useTasks } from "@/queries/tasks";
import { classifyDue, dueOrder, type DueStatus } from "@/lib/dueDate";
import { fromISODate, todayISO } from "@/lib/dates";
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

const dotClass: Record<Exclude<DueStatus, "none">, string> = {
  overdue: "bg-destructive",
  today: "bg-amber-500",
  soon: "bg-sky-500",
};

export function NotificationsBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspace } = useActiveWorkspace();
  const { data: tasks } = useTasks(workspace?.id ?? null);

  const items = useMemo(() => {
    const today = todayISO();
    return (tasks ?? [])
      .filter((tk) => tk.status !== "done" && tk.dueDate)
      .map((tk) => ({ task: tk, due: classifyDue(tk.dueDate, today) }))
      .filter((x) => x.due !== "none")
      .sort(
        (a, b) =>
          dueOrder[a.due] - dueOrder[b.due] ||
          (a.task.dueDate ?? "").localeCompare(b.task.dueDate ?? ""),
      );
  }, [tasks]);

  const urgent = items.filter(
    (x) => x.due === "overdue" || x.due === "today",
  ).length;
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.title")}>
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
        <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            {t("notifications.empty")}
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
