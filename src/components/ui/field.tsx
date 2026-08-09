"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Campos de formulário.
 *
 * Estética de linha, não de caixa: fundo levemente mais claro que a página e
 * uma borda inferior que acende em vermelho no foco. É o que separa o
 * formulário do visual "input arredondado de SaaS".
 */

export function Label({
  className,
  required,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "overline block text-ash-400 select-none",
        "peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {props.children}
      {required ? (
        <span className="ml-1 text-blood-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

const fieldBase = [
  "w-full bg-ink-850 text-bone-100 placeholder:text-ash-600",
  "border border-hairline border-b-2 border-b-ink-600",
  "px-4 transition-colors duration-200",
  "hover:border-b-ash-600",
  "focus:outline-none focus:border-b-blood-500 focus:bg-ink-800",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-b-blood-500 aria-[invalid=true]:bg-blood-700/10",
].join(" ");

export function Input({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12 text-sm", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldBase, "min-h-28 py-3 text-sm resize-y", className)}
      {...props}
    />
  );
}

/** Select nativo estilizado — leve, acessível e perfeito no mobile. */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          fieldBase,
          "h-12 appearance-none pr-10 text-sm cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-ash-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M1 1.5 6 6.5 11 1.5" />
      </svg>
    </div>
  );
}

/** Mensagem de erro de validação, ligada ao campo por aria-describedby. */
export function FieldError({
  id,
  children,
  className,
}: {
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "flex items-start gap-1.5 text-xs text-blood-400 leading-snug",
        className,
      )}
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Texto auxiliar neutro abaixo do campo. */
export function FieldHint({
  id,
  children,
  className,
}: {
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} className={cn("text-xs leading-snug text-ash-500", className)}>
      {children}
    </p>
  );
}

/** Agrupa rótulo, campo, dica e erro com o espaçamento padrão. */
export function Field({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
