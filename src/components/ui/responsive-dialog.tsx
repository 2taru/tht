import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import * as D from "@/components/ui/dialog";
import * as Dr from "@/components/ui/drawer";

/**
 * Адаптивний діалог: на десктопі — звичайний центрований Dialog, на телефоні
 * (< md) — нижній Drawer (vaul). API дзеркалить `@/components/ui/dialog`, тож
 * у місцях використання достатньо змінити шлях імпорту.
 *
 * Кожен підкомпонент сам читає `useIsMobile()` — значення глобальне (matchMedia),
 * тож Root і Content завжди в одному режимі в межах рендера.
 */

function Dialog(props: React.ComponentProps<typeof D.Dialog>) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Dr.Drawer : D.Dialog;
  return <Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof D.DialogTrigger>) {
  const isMobile = useIsMobile();
  const Trigger = isMobile ? Dr.DrawerTrigger : D.DialogTrigger;
  return <Trigger {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof D.DialogClose>) {
  const isMobile = useIsMobile();
  const Close = isMobile ? Dr.DrawerClose : D.DialogClose;
  return <Close {...props} />;
}

function DialogContent({
  className,
  children,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof D.DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Dr.DrawerContent>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-2 pb-6">
          {children}
        </div>
      </Dr.DrawerContent>
    );
  }
  return (
    <D.DialogContent
      className={className}
      showCloseButton={showCloseButton}
      {...props}
    >
      {children}
    </D.DialogContent>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div
        data-slot="dialog-header"
        className={cn("flex flex-col gap-1.5 text-left", className)}
        {...props}
      />
    );
  }
  return <D.DialogHeader className={className} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div
        data-slot="dialog-footer"
        className={cn("flex flex-col-reverse gap-2", className)}
        {...props}
      />
    );
  }
  return <D.DialogFooter className={className} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof D.DialogTitle>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Dr.DrawerTitle
        className={cn("text-lg leading-none", className)}
        {...props}
      />
    );
  }
  return <D.DialogTitle className={className} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof D.DialogDescription>) {
  const isMobile = useIsMobile();
  const Description = isMobile ? Dr.DrawerDescription : D.DialogDescription;
  return <Description className={className} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
