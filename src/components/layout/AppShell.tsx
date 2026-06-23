import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<Skeleton className="h-full min-h-96 w-full" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
