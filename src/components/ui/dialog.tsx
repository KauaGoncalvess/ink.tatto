"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Diálogo e painel lateral (sheet), ambos sobre a primitiva do Radix —
 * foco preso, Esc, scroll travado e aria-modal já vêm resolvidos.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-ink-950/85 backdrop-blur-sm",
        "data-[state=open]:animate-[ink-fade_.25s_ease-out]",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          "surface-raised p-6 sm:p-8",
          "data-[state=open]:animate-[ink-fade-up_.3s_var(--ease-out-expo)]",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 grid size-9 place-items-center text-ash-400",
              "transition-colors hover:bg-ink-700 hover:text-bone-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood-500",
            )}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Variante que entra pela lateral — usada no menu mobile e no admin. */
export function SheetContent({
  className,
  children,
  side = "right",
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "right";
  showClose?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(22rem,88vw)] flex-col",
          "bg-ink-900 border-hairline",
          side === "right"
            ? "right-0 border-l data-[state=open]:animate-[sheet-in-right_.35s_var(--ease-out-expo)]"
            : "left-0 border-r data-[state=open]:animate-[sheet-in-left_.35s_var(--ease-out-expo)]",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 grid size-9 place-items-center text-ash-400",
              "transition-colors hover:bg-ink-800 hover:text-bone-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood-500",
            )}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar menu</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("mb-6 space-y-2 pr-10", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-sans text-lg font-bold uppercase tracking-[0.08em] text-bone-100",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-relaxed text-ash-400", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
