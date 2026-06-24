import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CalendarClock,
  FolderKanban,
  ListTodo,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const items = [
  { to: "/timesheet", key: "nav.timesheet", icon: CalendarClock },
  { to: "/tasks", key: "nav.tasks", icon: ListTodo },
  { to: "/reports", key: "nav.reports", icon: BarChart3 },
  { to: "/projects", key: "nav.projects", icon: FolderKanban },
  { to: "/team", key: "nav.team", icon: Users },
  { to: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {items.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60",
              )
            }
          >
            <Icon className="size-4" />
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
