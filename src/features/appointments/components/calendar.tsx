"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AppointmentStatus, BlockReason } from "@prisma/client";
import { ChevronLeft, ChevronRight, Lock, Plus } from "lucide-react";

import { Panel, STATUS_LABELS } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/field";
import { BlockDialog } from "@/features/appointments/components/block-dialog";
import { addDaysISO, timeToMinutes, WEEKDAY_SHORT } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Calendário administrativo.
 *
 * Três visões sobre os mesmos dados. Toda a navegação (visão, data, artista)
 * vive na URL, então o servidor busca exatamente o intervalo exibido — nada de
 * carregar o ano inteiro para mostrar uma semana.
 *
 * Escrito à mão em vez de usar FullCalendar: a régua de horas precisa
 * respeitar o funcionamento do estúdio e os bloqueios, o que exigiria
 * customizar quase tudo de uma biblioteca de calendário genérica.
 */

export type CalendarAppointment = {
  id: string;
  code: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  clientName: string;
  artistName: string;
  artistId: string;
  serviceName: string;
};

export type CalendarBlock = {
  id: string;
  dateISO: string;
  endDateISO: string;
  startTime: string;
  endTime: string;
  reason: BlockReason;
  note: string | null;
  artistName: string | null;
};

type StudioHours = {
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  PENDING: "bg-status-pending",
  CONFIRMED: "bg-status-confirmed",
  COMPLETED: "bg-status-completed",
  CANCELLED: "bg-status-cancelled",
  NO_SHOW: "bg-status-noshow",
};

/**
 * Cor da régua lateral do compromisso na visão de mês.
 *
 * O status era comunicado só por um ponto de 6px — ou seja, só por cor, o que
 * exclui quem não distingue essas cinco matizes e é ilegível para todo mundo
 * nesse tamanho. A régua dá área suficiente para a cor funcionar, e o `title`
 * ao lado entrega o nome do status por escrito.
 */
const STATUS_RULE: Record<AppointmentStatus, string> = {
  PENDING: "border-l-status-pending",
  CONFIRMED: "border-l-status-confirmed",
  COMPLETED: "border-l-status-completed",
  CANCELLED: "border-l-status-cancelled",
  NO_SHOW: "border-l-status-noshow",
};

const BLOCK_LABELS: Record<BlockReason, string> = {
  DAY_OFF: "Folga",
  VACATION: "Férias",
  BREAK: "Pausa",
  APPOINTMENT_HOLD: "Reservado",
  OTHER: "Bloqueio",
};

export function AdminCalendar({
  view,
  anchorISO,
  artistId,
  artists,
  fromISO,
  toISO,
  appointments,
  blocks,
  studioHours,
}: {
  view: "mes" | "semana" | "dia";
  anchorISO: string;
  artistId: string;
  artists: { id: string; name: string }[];
  fromISO: string;
  toISO: string;
  appointments: CalendarAppointment[];
  blocks: CalendarBlock[];
  studioHours: StudioHours[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [blockTarget, setBlockTarget] = React.useState<{
    dateISO: string;
    time: string;
  } | null>(null);

  const navigate = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Passo de navegação de cada visão. */
  function shift(direction: 1 | -1) {
    const step = view === "dia" ? 1 : view === "semana" ? 7 : 0;

    if (step > 0) {
      navigate({ data: addDaysISO(anchorISO, step * direction) });
      return;
    }

    // Mês: avança preservando o dia 1, evitando o problema de "31 de janeiro
    // + 1 mês".
    const [year, month] = anchorISO.split("-").map(Number);
    const next = new Date(Date.UTC(year!, month! - 1 + direction, 1));
    navigate({ data: next.toISOString().slice(0, 10) });
  }

  const title = React.useMemo(() => {
    const date = new Date(`${anchorISO}T12:00:00Z`);
    if (view === "dia") {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeZone: "UTC",
      }).format(date);
    }
    if (view === "semana") {
      const end = new Date(`${toISO}T12:00:00Z`);
      const fmt = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      });
      return `${fmt.format(new Date(`${fromISO}T12:00:00Z`))} – ${fmt.format(end)}`;
    }
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }, [anchorISO, view, fromISO, toISO]);

  return (
    <>
      {/* Barra de controle */}
      <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="grid size-9 place-items-center border border-hairline text-bone-200 transition-colors hover:bg-ink-800"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">Período anterior</span>
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="grid size-9 place-items-center border border-hairline text-bone-200 transition-colors hover:bg-ink-800"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="sr-only">Próximo período</span>
          </button>

          <Button variant="ghost" size="sm" onClick={() => navigate({ data: null })}>
            Hoje
          </Button>

          <h2
            aria-live="polite"
            className="ml-2 text-sm font-semibold uppercase tracking-[0.1em] text-bone-100 first-letter:uppercase"
          >
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Filtrar por artista"
            value={artistId}
            onChange={(event) => navigate({ artista: event.target.value || null })}
            className="h-9 w-auto min-w-40 text-xs"
          >
            <option value="">Todos os artistas</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </NativeSelect>

          {/* Seletor de visão */}
          <div role="group" aria-label="Visão do calendário" className="flex">
            {(["mes", "semana", "dia"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => navigate({ visao: option === "mes" ? null : option })}
                className={cn(
                  "border px-3 py-2 label-xs transition-colors",
                  view === option
                    ? "border-hairline-strong bg-ink-700 text-bone-100"
                    : "border-hairline text-ash-400 hover:bg-ink-800 hover:text-bone-200",
                  option !== "mes" && "-ml-px",
                )}
              >
                {option === "mes" ? "Mês" : option === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => setBlockTarget({ dateISO: anchorISO, time: "09:00" })}>
            <Lock aria-hidden="true" />
            Bloquear
          </Button>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {view === "mes" ? (
          <MonthView
            fromISO={fromISO}
            anchorISO={anchorISO}
            appointments={appointments}
            blocks={blocks}
            onSelectDay={(dateISO) => navigate({ visao: "dia", data: dateISO })}
          />
        ) : (
          <TimeGridView
            fromISO={fromISO}
            toISO={toISO}
            appointments={appointments}
            blocks={blocks}
            studioHours={studioHours}
            onSelectSlot={(dateISO, time) => setBlockTarget({ dateISO, time })}
          />
        )}
      </Panel>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.6875rem] text-ash-500">
        {/* Amostra em régua, do mesmo formato que aparece na célula — seis
            quadrados de 6px não se distinguem entre si. */}
        {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-3 w-0.5", STATUS_DOT[status])}
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 bg-[repeating-linear-gradient(45deg,#35353d,#35353d_2px,transparent_2px,transparent_4px)]"
          />
          Bloqueio
        </span>
      </div>

      <BlockDialog
        open={blockTarget !== null}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        artists={artists}
        defaultArtistId={artistId}
        defaultDateISO={blockTarget?.dateISO ?? anchorISO}
        defaultTime={blockTarget?.time ?? "09:00"}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Visão de mês
// ---------------------------------------------------------------------------

function MonthView({
  fromISO,
  anchorISO,
  appointments,
  blocks,
  onSelectDay,
}: {
  fromISO: string;
  anchorISO: string;
  appointments: CalendarAppointment[];
  blocks: CalendarBlock[];
  onSelectDay: (dateISO: string) => void;
}) {
  const currentMonth = anchorISO.slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appointment of appointments) {
      const bucket = map.get(appointment.dateISO);
      if (bucket) bucket.push(appointment);
      else map.set(appointment.dateISO, [appointment]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [appointments]);

  const blockedDays = React.useMemo(() => {
    const set = new Set<string>();
    for (const block of blocks) {
      for (
        let dateISO = block.dateISO;
        dateISO <= block.endDateISO;
        dateISO = addDaysISO(dateISO, 1)
      ) {
        set.add(dateISO);
      }
    }
    return set;
  }, [blocks]);

  const days = Array.from({ length: 42 }, (_, index) => addDaysISO(fromISO, index));

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-hairline">
        {WEEKDAY_SHORT.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center label-xs text-ash-600"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((dateISO) => {
          const dayAppointments = byDay.get(dateISO) ?? [];
          const outside = !dateISO.startsWith(currentMonth);
          const isToday = dateISO === today;
          const blocked = blockedDays.has(dateISO);

          return (
            <button
              key={dateISO}
              type="button"
              onClick={() => onSelectDay(dateISO)}
              className={cn(
                // A célula tinha 96px de altura para exibir uma linha de 14px.
                // Mostrar o mês inteiro custava 700px de tela para vinte
                // compromissos — a pior relação informação/pixel do produto.
                "group flex min-h-16 flex-col items-stretch gap-1 border-b border-r border-hairline p-1.5 text-left transition-colors hover:bg-ink-850 sm:min-h-20",
                // Dias de outro mês recuam por fundo, não por opacidade: 40%
                // de opacidade derrubava o número para 2.3:1 de contraste.
                outside && "bg-ink-950/70",
                // A hachura vale só para bloqueio, e só dentro do mês. Antes
                // ela também caía nos dias vizinhos, deixando "bloqueado" e
                // "outro mês" com exatamente a mesma aparência.
                blocked &&
                  !outside &&
                  "bg-[repeating-linear-gradient(45deg,rgba(53,53,61,.25),rgba(53,53,61,.25)_3px,transparent_3px,transparent_7px)]",
              )}
            >
              <span className="flex shrink-0 items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-grid size-6 place-items-center text-xs tabular-nums",
                    isToday
                      ? "font-bold text-bone-100 ring-1 ring-bone-100"
                      : outside
                        ? "text-ash-600"
                        : "text-ash-400 group-hover:text-bone-200",
                  )}
                >
                  {Number(dateISO.slice(8))}
                </span>

                <span className="flex items-center gap-1">
                  {blocked && !outside ? (
                    <Lock className="size-3 text-ash-500" aria-label="Dia com bloqueio" />
                  ) : null}

                  {/* Carga do dia: sem isto, um dia com uma sessão e outro com
                      seis pareciam iguais até você contar as linhas. */}
                  {dayAppointments.length > 0 ? (
                    <span className="label-xs text-ash-500 tabular-nums">
                      {dayAppointments.length}
                    </span>
                  ) : null}
                </span>
              </span>

              <span className="flex flex-col gap-px overflow-hidden">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <span
                    key={appointment.id}
                    title={`${appointment.startTime} · ${appointment.clientName} · ${STATUS_LABELS[appointment.status]}`}
                    className={cn(
                      "flex items-center gap-1 truncate border-l-2 pl-1.5 text-[0.6875rem] text-ash-300",
                      STATUS_RULE[appointment.status],
                    )}
                  >
                    <span className="tabular-nums">{appointment.startTime}</span>
                    <span className="truncate">{appointment.clientName}</span>
                  </span>
                ))}

                {dayAppointments.length > 3 ? (
                  <span className="pl-1.5 text-[0.6875rem] text-ash-500">
                    +{dayAppointments.length - 3} mais
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visões de semana e dia (grade de horas)
// ---------------------------------------------------------------------------

function TimeGridView({
  fromISO,
  toISO,
  appointments,
  blocks,
  studioHours,
  onSelectSlot,
}: {
  fromISO: string;
  toISO: string;
  appointments: CalendarAppointment[];
  blocks: CalendarBlock[];
  studioHours: StudioHours[];
  onSelectSlot: (dateISO: string, time: string) => void;
}) {
  // Régua de horas: do menor horário de abertura ao maior de fechamento.
  const { startHour, endHour } = React.useMemo(() => {
    const open = studioHours.filter((entry) => entry.isOpen);
    if (open.length === 0) return { startHour: 8, endHour: 21 };
    return {
      startHour: Math.floor(
        Math.min(...open.map((entry) => timeToMinutes(entry.opensAt))) / 60,
      ),
      endHour: Math.ceil(
        Math.max(...open.map((entry) => timeToMinutes(entry.closesAt))) / 60,
      ),
    };
  }, [studioHours]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const days: string[] = [];
  for (let dateISO = fromISO; dateISO <= toISO; dateISO = addDaysISO(dateISO, 1)) {
    days.push(dateISO);
  }

  const ROW_HEIGHT = 56; // px por hora
  const gridMinutes = (endHour - startHour) * 60;

  /** Converte "HH:mm" em porcentagem de altura dentro da régua. */
  function offsetPercent(time: string) {
    return ((timeToMinutes(time) - startHour * 60) / gridMinutes) * 100;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-160"
        style={{ ["--row-height" as string]: `${ROW_HEIGHT}px` }}
      >
        {/* Cabeçalho dos dias */}
        <div
          className="sticky top-0 z-10 grid border-b border-hairline bg-ink-900"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0,1fr))` }}
        >
          <div />
          {days.map((dateISO) => {
            const date = new Date(`${dateISO}T12:00:00Z`);
            const isToday = dateISO === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={dateISO}
                className={cn(
                  "border-l border-hairline px-2 py-2.5 text-center",
                  isToday && "bg-ink-850",
                )}
              >
                <span className="block label-xs text-ash-600">
                  {WEEKDAY_SHORT[date.getUTCDay()]}
                </span>
                <span
                  className={cn(
                    "mt-1 inline-grid size-6 place-items-center text-xs tabular-nums",
                    isToday
                      ? "font-bold text-bone-100 ring-1 ring-bone-100"
                      : "text-bone-200",
                  )}
                >
                  {Number(dateISO.slice(8))}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grade */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0,1fr))` }}
        >
          {/* Coluna de horas */}
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-hairline pr-2 text-right"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="absolute -top-2 right-2 text-[0.6875rem] tabular-nums text-ash-600">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas de dia */}
          {days.map((dateISO) => {
            const dayAppointments = appointments.filter((a) => a.dateISO === dateISO);
            const dayBlocks = blocks.filter(
              (b) => dateISO >= b.dateISO && dateISO <= b.endDateISO,
            );

            return (
              <div key={dateISO} className="relative border-l border-hairline">
                {/* Slots clicáveis, um por hora */}
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() =>
                      onSelectSlot(dateISO, `${String(hour).padStart(2, "0")}:00`)
                    }
                    className="group block w-full border-b border-hairline transition-colors hover:bg-ink-850"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="sr-only">
                      Bloquear {dateISO} às {String(hour).padStart(2, "0")}:00
                    </span>
                    <Plus
                      aria-hidden="true"
                      className="mx-auto size-3.5 text-ash-700 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                ))}

                {/* Bloqueios */}
                {dayBlocks.map((block) => {
                  const start = block.dateISO === dateISO ? block.startTime : "00:00";
                  const end = block.endDateISO === dateISO ? block.endTime : "23:59";
                  const top = Math.max(0, offsetPercent(start));
                  const bottom = Math.min(100, offsetPercent(end));
                  if (bottom <= 0 || top >= 100) return null;

                  return (
                    <div
                      key={`${block.id}-${dateISO}`}
                      title={`${BLOCK_LABELS[block.reason]}${block.note ? ` — ${block.note}` : ""}`}
                      className="pointer-events-none absolute inset-x-0.5 border border-ash-700/40 bg-[repeating-linear-gradient(45deg,rgba(53,53,61,.4),rgba(53,53,61,.4)_3px,transparent_3px,transparent_7px)] px-1.5 py-1"
                      style={{ top: `${top}%`, height: `${Math.max(2, bottom - top)}%` }}
                    >
                      <span className="label-xs text-ash-400">
                        {BLOCK_LABELS[block.reason]}
                        {block.artistName ? ` · ${block.artistName}` : " · estúdio"}
                      </span>
                    </div>
                  );
                })}

                {/* Agendamentos */}
                {dayAppointments.map((appointment) => {
                  const top = offsetPercent(appointment.startTime);
                  const bottom = offsetPercent(appointment.endTime);
                  if (bottom <= 0 || top >= 100) return null;

                  return (
                    <Link
                      key={appointment.id}
                      href={`/admin/agendamentos/${appointment.id}`}
                      title={`${appointment.startTime} · ${appointment.clientName} · ${appointment.serviceName} · ${appointment.artistName}`}
                      className={cn(
                        "absolute inset-x-1 overflow-hidden border-l-2 bg-ink-800 px-1.5 py-1 transition-colors hover:bg-ink-700",
                        appointment.status === "CANCELLED" && "opacity-50 line-through",
                      )}
                      style={{
                        top: `${Math.max(0, top)}%`,
                        height: `${Math.max(3, Math.min(100, bottom) - Math.max(0, top))}%`,
                        borderLeftColor: `var(--color-status-${appointment.status.toLowerCase().replace("_", "")})`,
                      }}
                    >
                      <span className="block truncate text-[0.6875rem] font-semibold text-bone-100">
                        {appointment.startTime} {appointment.clientName}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-ash-500">
                        {appointment.serviceName} · {appointment.artistName}
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
