import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Липкий заголовок сторінки: залишається зверху при прокрутці контенту в `main`.
 * Відʼємні поля «пробивають» падінги скрол-контейнера (`p-3 sm:p-6`), а власні
 * падінги повертають вміст на місце; відʼємний `-mt` виносить sticky-констрейнт
 * до верху вьюпорта (інакше зʼявився б розрив у висоту падінга). `bg-background`
 * ховає контент, що прокручується під заголовком.
 */
export function StickyBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-3 -mt-3 bg-background px-3 pb-3 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
