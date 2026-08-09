"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Interruptor com rótulo e dica.
 *
 * Retangular como todo o resto do sistema — um "pill" arredondado seria o
 * único elemento com curva na interface inteira.
 */
export function Switch({
  label,
  hint,
  className,
  id,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  label: string;
  hint?: string;
}) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  const hintId = hint ? `${switchId}-hint` : undefined;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <SwitchPrimitive.Root
        id={switchId}
        aria-describedby={hintId}
        className={cn(
          "group relative mt-0.5 h-6 w-11 shrink-0 border transition-colors",
          "data-[state=checked]:border-blood-500 data-[state=checked]:bg-blood-500",
          "data-[state=unchecked]:border-hairline-strong data-[state=unchecked]:bg-ink-800",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "block size-4 bg-bone-100 transition-transform",
            "translate-x-1 data-[state=checked]:translate-x-6",
          )}
        />
      </SwitchPrimitive.Root>

      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className="block cursor-pointer text-sm text-bone-100 select-none"
        >
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-1 text-xs leading-snug text-ash-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
