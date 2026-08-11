import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tela de estado (erro, 404, indisponível).
 *
 * Usada por todas as páginas de exceção para que uma falha continue dentro da
 * identidade do estúdio — o padrão do Next é uma página branca, que quebra a
 * marca justamente no momento em que o visitante já está frustrado.
 */
export function StatusScreen({
  code,
  eyebrow,
  title,
  description,
  actions,
  note,
  className,
}: {
  /** Número grande em marca d'água (404, 500…). Opcional. */
  code?: string;
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
  /** Detalhe técnico discreto (ex.: código do erro), útil no suporte. */
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate grid min-h-[70dvh] place-items-center overflow-hidden px-5 py-24",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(200,16,46,0.09),transparent_60%)]"
      />

      {code ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(9rem,34vw,24rem)] leading-none text-ink-800/70 select-none"
        >
          {code}
        </span>
      ) : null}

      <div className="relative max-w-lg text-center">
        <span className="inline-flex items-center gap-3 overline text-blood-400">
          <span aria-hidden="true" className="h-px w-8 bg-blood-500" />
          {eyebrow}
        </span>

        <h1 className="display-title mt-6 text-[clamp(2rem,6vw,3.5rem)] text-balance">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ash-400 text-pretty">
          {description}
        </p>

        {actions ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {actions}
          </div>
        ) : null}

        {note ? (
          <p className="mt-8 label-xs text-ash-700">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
