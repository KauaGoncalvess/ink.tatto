"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { todayISO, WEEKDAY_SHORT } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Calendário de seleção de data.
 *
 * Escrito à mão em vez de trazer uma dependência: a única regra que importa é
 * "esta data tem vaga para este artista e serviço?", e ela vem pronta do
 * servidor (`availableDays`). Um datepicker genérico ainda exigiria toda essa
 * camada de disponibilidade por cima.
 *
 * A aritmética usa Date.UTC deliberadamente — são datas de calendário, não
 * instantes, e usar o fuso do navegador viraria bug de virada de dia.
 */

type Props = {
  value: string | null;
  onChange: (dateISO: string) => void;
  /** Datas com ao menos um horário livre. `null` = ainda carregando. */
  availableDays: string[] | null;
  minDateISO: string;
  maxDateISO: string;
  isLoading?: boolean;
};

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BookingCalendar({
  value,
  onChange,
  availableDays,
  minDateISO,
  maxDateISO,
  isLoading = false,
}: Props) {
  const initial = value ?? minDateISO;
  const [cursor, setCursor] = React.useState(() => {
    const [year, month] = initial.split("-").map(Number);
    return { year: year!, month: month! - 1 };
  });

  const availableSet = React.useMemo(
    () => (availableDays ? new Set(availableDays) : null),
    [availableDays],
  );

  const today = todayISO();

  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();

  const monthStartISO = toISO(cursor.year, cursor.month, 1);
  const monthEndISO = toISO(cursor.year, cursor.month, daysInMonth);

  // Desabilita a navegação fora da janela permitida de agendamento.
  const canGoBack = monthStartISO > minDateISO;
  const canGoForward = monthEndISO < maxDateISO;

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      toISO(cursor.year, cursor.month, index + 1),
    ),
  ];

  // O grid é quebrado em semanas de verdade porque `role="grid"` exige
  // `role="row"` entre a grade e as células: um grid CSS de 7 colunas até
  // *parece* uma tabela, mas o leitor de tela não tem como anunciar linha e
  // coluna sem essa estrutura. Cada semana completa 7 posições para as bordas
  // do mês não desalinharem as colunas.
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <div className="surface p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          className="grid size-9 place-items-center border border-hairline text-bone-200 transition-colors hover:border-hairline-strong hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only">Mês anterior</span>
        </button>

        <h3
          aria-live="polite"
          className="text-sm font-semibold uppercase tracking-[0.14em] text-bone-100 first-letter:uppercase"
        >
          {monthLabel(cursor.year, cursor.month)}
        </h3>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoForward}
          className="grid size-9 place-items-center border border-hairline text-bone-200 transition-colors hover:border-hairline-strong hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="sr-only">Próximo mês</span>
        </button>
      </div>

      <div className="mt-6" role="grid" aria-label="Escolha a data">
        <div className="grid grid-cols-7 gap-1" role="row">
          {WEEKDAY_SHORT.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="pb-2 text-center label-xs text-ash-600"
            >
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1" role="row">
            {week.map((dateISO, index) => {
              if (!dateISO) {
                // Célula vazia das bordas do mês. Continua sendo `gridcell`
                // para a linha ter as 7 posições que o leitor de tela anuncia;
                // sem conteúdo, é lida como célula em branco.
                return <div key={`empty-${index}`} role="gridcell" />;
              }

              const outOfRange = dateISO < minDateISO || dateISO > maxDateISO;
              // Enquanto availableSet é null estamos carregando: a data segue
              // clicável para não travar a interação, e a lista de horários
              // resolve o caso de não haver vaga.
              const unavailable = availableSet ? !availableSet.has(dateISO) : false;
              const disabled = outOfRange || unavailable;
              const selected = value === dateISO;
              const isToday = dateISO === today;

              return (
                <button
                  key={dateISO}
                  type="button"
                  role="gridcell"
                  disabled={disabled}
                  aria-selected={selected}
                  aria-label={new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "full",
                    timeZone: "UTC",
                  }).format(new Date(`${dateISO}T00:00:00Z`))}
                  onClick={() => onChange(dateISO)}
                  className={cn(
                    "relative grid aspect-square place-items-center border text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood-500",
                    selected
                      ? "border-blood-500 bg-blood-500 font-semibold text-bone-100"
                      : disabled
                        ? "cursor-not-allowed border-transparent text-ash-600 line-through decoration-ash-600/60"
                        : "border-hairline text-bone-200 hover:border-blood-500 hover:bg-ink-800",
                    isLoading && !selected && "opacity-60",
                  )}
                >
                  {Number(dateISO.slice(8))}
                  {isToday && !selected ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 size-1 rounded-full bg-blood-500"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4 text-[0.6875rem] text-ash-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 bg-blood-500" />
          Selecionado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 border border-hairline" />
          Disponível
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 bg-ink-800" />
          Sem vaga
        </span>
      </p>
    </div>
  );
}
