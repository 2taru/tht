import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { MobileNav } from "./MobileNav";
import { NotificationsBell } from "./NotificationsBell";

export function Topbar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b px-2 sm:px-4">
      <div className="flex items-center gap-1">
        <MobileNav />
        <WorkspaceSwitcher />
      </div>
      <div className="flex items-center gap-1">
        <NotificationsBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-8">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
