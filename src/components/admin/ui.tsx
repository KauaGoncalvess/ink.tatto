import * as React from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

/**
 * Peças compartilhadas do painel.
 *
 * Ficam num arquivo só porque são pequenas e sempre usadas juntas — quebrar em
 * oito arquivos de dez linhas só aumentaria o custo de navegar pelo projeto.
 */

/** Cabeçalho de página do admin. */
export function AdminPageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? (
          <Link
            href={breadcrumb.href}
            className="mb-3 inline-block text-[0.6875rem] uppercase tracking-[0.16em] text-ash-500 transition-colors hover:text-blood-400"
          >
            ← {breadcrumb.label}
          </Link>
        ) : null}

        <h1 className="font-display text-3xl uppercase tracking-tight text-bone-100 sm:text-4xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-ash-400">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Painel de conteúdo. */
export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("surface", className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-bone-100">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-ash-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status de agendamento
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

/** Cor por status. Tons dessaturados de propósito: o vermelho da marca é
 *  reservado para ações, não pode competir com indicadores de estado. */
const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "border-status-pending/40 bg-status-pending/10 text-status-pending",
  CONFIRMED: "border-status-confirmed/40 bg-status-confirmed/10 text-status-confirmed",
  COMPLETED: "border-status-completed/40 bg-status-completed/10 text-status-completed",
  CANCELLED: "border-status-cancelled/40 bg-status-cancelled/10 text-status-cancelled",
  NO_SHOW: "border-status-noshow/40 bg-status-noshow/10 text-status-noshow",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Etiqueta neutra para categorias, estilos e contagens. */
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block border border-hairline px-2 py-1 text-[0.625rem] uppercase tracking-[0.1em] text-ash-400",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? (
        <span className="mb-5 grid size-12 place-items-center border border-hairline text-ash-600">
          {icon}
        </span>
      ) : null}
      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-bone-200">
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-ash-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** Métrica do dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  /** Destaca o número — usado só na métrica que exige ação. */
  accent?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.625rem] uppercase leading-tight tracking-[0.14em] text-ash-500">
          {label}
        </span>
        {icon ? (
          <span className={cn("shrink-0", accent ? "text-blood-500" : "text-ash-600")}>
            {icon}
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          "mt-4 block font-display text-4xl tabular-nums",
          accent ? "text-blood-400" : "text-bone-100",
        )}
      >
        {value}
      </span>

      {hint ? <span className="mt-2 block text-xs text-ash-600">{hint}</span> : null}
    </>
  );

  const className = cn(
    "surface flex flex-col p-5 transition-colors",
    href && "hover:border-hairline-strong",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

// ---------------------------------------------------------------------------
// Tabela responsiva
// ---------------------------------------------------------------------------

/**
 * Envelope de tabela.
 *
 * A tabela em si é escondida abaixo de `md` — cada página renderiza uma lista
 * de cards no lugar. Redimensionar colunas num celular de 375px produz uma
 * tabela ilegível; um card por registro é a leitura correta nessa largura.
 */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-160 border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-hairline px-4 py-3 text-left text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ash-500",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("border-b border-hairline px-4 py-3 align-middle", className)}
      {...props}
    >
      {children}
    </td>
  );
}
