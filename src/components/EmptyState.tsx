import type { ReactNode } from "react";
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
    <div
      className={cn(
        "rounded-lg border border-dashed p-8 text-center text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
