import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { m } from "motion/react";
import { pageFade } from "@/lib/motion";
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
            {/* Без exit-анімації (mode="wait" додавав мертвий час на кожну
                навігацію): стара сторінка зникає одразу, нова м'яко входить. */}
            <m.div key={location.pathname} {...pageFade} className="h-full">
              <Outlet />
            </m.div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
