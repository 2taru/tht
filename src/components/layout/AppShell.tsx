import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, m } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell() {
  const location = useLocation();
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          <Suspense fallback={<Skeleton className="h-full min-h-96 w-full" />}>
            <AnimatePresence mode="wait">
              <m.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Outlet />
              </m.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
