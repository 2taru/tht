import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarNav />
    </aside>
  );
}
