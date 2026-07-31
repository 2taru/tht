import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./SidebarNav";

/**
 * Перемикач бокової панелі (лише desktop). Клік згортає/розгортає її.
 * Коли згорнуто — наведення на кнопку показує плаваючу панель із навігацією
 * (як у Claude). Місток-падінг зверху панелі не дає hover-ланцюгу розриватись.
 */
export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="group relative hidden lg:block">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={t("common.toggleSidebar")}
        title={t("common.toggleSidebar")}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </Button>
      {collapsed && (
        <div className="invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
          <div className="w-56 overflow-hidden rounded-lg border bg-sidebar text-sidebar-foreground shadow-lg">
            <SidebarNav />
          </div>
        </div>
      )}
    </div>
  );
}
