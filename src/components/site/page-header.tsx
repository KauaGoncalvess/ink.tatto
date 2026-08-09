import * as React from "react";

import { Eyebrow } from "@/components/site/section";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho das páginas internas.
 *
 * Reaproveitado em todas as rotas públicas para que a transição entre páginas
 * pareça um site só. O padding superior compensa a navbar fixa.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "relative border-b border-hairline bg-ink-900/40",
        "pt-32 pb-14 md:pt-40 md:pb-20",
        className,
      )}
    >
      {/* Brilho radial discreto, o mesmo motivo usado no hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(200,16,46,0.08),transparent_55%)]"
      />

      <div className="container-editorial relative">
        {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}

        <h1 className="display-title text-[clamp(2.25rem,7vw,5rem)] text-balance">
          {title}
        </h1>

        {description ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ash-300 text-pretty">
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </header>
  );
}
