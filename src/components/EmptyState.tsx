import type { ReactNode } from "react";
import { m } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Спільний порожній стан: пунктирна панель із центрованим текстом. */
export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: EASE_OUT }}
      className={cn(
        "rounded-lg border border-dashed p-8 text-center text-muted-foreground",
        className,
      )}
    >
      {children}
    </m.div>
  );
}
