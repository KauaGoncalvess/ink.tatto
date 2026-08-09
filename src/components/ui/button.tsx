import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botão do sistema.
 *
 * Nada de cantos arredondados grandes nem sombra difusa: a linguagem é seca,
 * retangular e de alto contraste. O deslocamento de 1px no :active dá o
 * feedback tátil sem animação chamativa.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap",
    "font-semibold uppercase tracking-[0.14em] leading-none",
    "transition-[background-color,color,border-color,transform,opacity] duration-200",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood-500",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:translate-y-px",
    "[&_svg]:shrink-0 [&_svg]:transition-transform",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-blood-500 text-bone-100 hover:bg-blood-400 disabled:hover:bg-blood-500",
        outline:
          "border border-hairline-strong bg-transparent text-bone-100 hover:border-bone-100 hover:bg-bone-100 hover:text-ink-950",
        ghost:
          "bg-transparent text-bone-200 hover:bg-ink-800 hover:text-bone-100",
        subtle:
          "bg-ink-800 text-bone-100 border border-hairline hover:bg-ink-700 hover:border-hairline-strong",
        danger:
          "border border-blood-700 bg-transparent text-blood-400 hover:bg-blood-600 hover:text-bone-100 hover:border-blood-600",
        link: "bg-transparent text-blood-400 hover:text-blood-300 underline-offset-4 hover:underline p-0 h-auto tracking-[0.1em]",
      },
      size: {
        sm: "h-9 px-4 text-[0.6875rem] [&_svg]:size-3.5",
        md: "h-11 px-6 text-xs [&_svg]:size-4",
        lg: "h-14 px-8 text-[0.8125rem] [&_svg]:size-4",
        icon: "size-10 px-0 [&_svg]:size-4",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Mostra spinner e bloqueia o clique. */
    isLoading?: boolean;
    /** Texto anunciado a leitores de tela durante o carregamento. */
    loadingText?: string;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  isLoading = false,
  loadingText = "Carregando",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  // Com asChild o filho é um elemento único (ex.: <Link>), então não podemos
  // injetar o spinner sem quebrar a árvore — o loading só se aplica ao <button>.
  if (asChild) {
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { buttonVariants };
