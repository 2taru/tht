import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { router } from "@/routes/router";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <ThemeProvider>
      {/* reducedMotion — поважаємо prefers-reduced-motion; LazyMotion — лише
          domAnimation-фічі (легший бандл), strict вимагає m-компоненти. */}
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation} strict>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </QueryClientProvider>
        </LazyMotion>
      </MotionConfig>
    </ThemeProvider>
  );
}
