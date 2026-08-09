import * as React from "react";

import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/**
 * Blocos de composição das seções públicas.
 *
 * Estes três componentes carregam os motivos da marca — a barra vermelha antes
 * do eyebrow, o título display gigante, o respiro vertical. Usá-los em toda
 * seção é o que faz a página ler como uma identidade só em vez de uma coleção
 * de blocos.
 */

/** Rótulo pequeno em caixa alta, precedido de uma barra vermelha. */
export function Eyebrow({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 text-blood-500 overline",
        align === "center" && "justify-center",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-8 bg-blood-500" />
      {children}
    </span>
  );
}

/** Título display. `as` mantém a hierarquia semântica correta por página. */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-[clamp(1.75rem,4vw,2.75rem)]",
    md: "text-[clamp(2.25rem,5.5vw,4.5rem)]",
    lg: "text-[clamp(2.75rem,8vw,7rem)]",
  } as const;

  return (
    <Tag className={cn("display-title text-balance", sizes[size], className)}>
      {children}
    </Tag>
  );
}

/** Cabeçalho completo de seção: eyebrow + título + texto de apoio. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
  size = "md",
  className,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Botão opcional alinhado à direita no desktop. */
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        action && "lg:flex-row lg:items-end lg:justify-between lg:gap-12",
        className,
      )}
    >
      <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        {eyebrow ? (
          <Eyebrow align={align} className="mb-5">
            {eyebrow}
          </Eyebrow>
        ) : null}

        <SectionTitle as={as} size={size}>
          {title}
        </SectionTitle>

        {description ? (
          <p
            className={cn(
              "mt-6 max-w-xl text-base leading-relaxed text-ash-300 text-pretty",
              align === "center" && "mx-auto",
            )}
          >
            {description}
          </p>
        ) : null}
      </Reveal>

      {action ? (
        <Reveal delay={120} className="shrink-0">
          {action}
        </Reveal>
      ) : null}
    </div>
  );
}

/** Envelope de seção com o espaçamento vertical padrão do projeto. */
export function Section({
  children,
  className,
  id,
  spacing = "md",
  ...props
}: React.ComponentProps<"section"> & { spacing?: "sm" | "md" | "lg" }) {
  const spacings = {
    sm: "py-16 md:py-20",
    md: "py-20 md:py-28 lg:py-32",
    lg: "py-24 md:py-32 lg:py-40",
  } as const;

  return (
    <section id={id} className={cn(spacings[spacing], className)} {...props}>
      {children}
    </section>
  );
}

/** Régua vermelha usada como separador dentro de seções. */
export function AccentRule({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-0.5 w-16 bg-blood-500", className)} />;
}
