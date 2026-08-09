/**
 * Motor de disponibilidade — o núcleo do produto.
 *
 * Este módulo é deliberadamente PURO: recebe todos os dados já carregados e
 * devolve os horários livres. Não toca no Prisma, não lê `process.env` e não
 * usa o relógio do sistema (o "agora" é sempre um parâmetro). É isso que o
 * torna testável de verdade — ver src/lib/availability.test.ts.
 *
 * A camada que busca no banco vive em src/features/booking/queries.ts.
 *
 * Regras compostas, nesta ordem:
 *   1. janela de funcionamento do estúdio ∩ grade semanal do artista
 *   2. remove o intervalo (almoço/pausa) do artista
 *   3. remove bloqueios (folga, férias, bloqueio manual, feriado do estúdio)
 *   4. remove sobreposição com agendamentos ativos
 *   5. exige que duração + buffer caibam inteiros na janela
 *   6. descarta horários antes de agora + antecedência mínima
 */

import {
  addDaysISO,
  minutesToTime,
  overlaps,
  timeToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/datetime";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

/** Grade semanal do artista para um dia da semana. */
export type WeeklySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isActive?: boolean;
};

/** Funcionamento do estúdio para um dia da semana. */
export type StudioHours = {
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

/** Intervalo ocupado, em UTC. Cobre agendamentos e bloqueios. */
export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailabilityRules = {
  /** Passo da grade oferecida ao cliente, em minutos. */
  slotStepMin: number;
  /** Antecedência mínima entre agora e o início da sessão, em horas. */
  minLeadTimeHours: number;
  /** Fuso do estúdio. */
  timezone: string;
};

export type SlotQuery = {
  /** Data local no fuso do estúdio, "YYYY-MM-DD". */
  dateISO: string;
  /** Duração da sessão em minutos. */
  durationMin: number;
  /** Folga após a sessão, também reservada na agenda. */
  bufferMin: number;
  schedule: WeeklySchedule[];
  studioHours: StudioHours[];
  busy: BusyInterval[];
  rules: AvailabilityRules;
  /** Instante de referência. Parâmetro — nunca `new Date()` interno. */
  now: Date;
};

export type Slot = {
  /** "14:30" no fuso do estúdio. */
  time: string;
  /** Início em UTC. */
  startsAt: Date;
  /** Fim em UTC, já incluindo o buffer. */
  endsAt: Date;
};

// ---------------------------------------------------------------------------
// Aritmética de janelas (em minutos desde a meia-noite local)
// ---------------------------------------------------------------------------

type Window = { start: number; end: number };

/** Interseção de duas janelas, ou null se não houver. */
function intersect(a: Window, b: Window): Window | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
}

/** Remove `cut` de `window`, podendo resultar em zero, uma ou duas janelas. */
function subtract(window: Window, cut: Window): Window[] {
  if (cut.end <= window.start || cut.start >= window.end) return [window];

  const parts: Window[] = [];
  if (cut.start > window.start) parts.push({ start: window.start, end: cut.start });
  if (cut.end < window.end) parts.push({ start: cut.end, end: window.end });
  return parts;
}

function subtractAll(windows: Window[], cuts: Window[]): Window[] {
  return cuts.reduce<Window[]>(
    (acc, cut) => acc.flatMap((w) => subtract(w, cut)),
    windows,
  );
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

/**
 * Janelas de trabalho do artista no dia, em minutos locais, já descontando
 * o funcionamento do estúdio e o intervalo do artista.
 *
 * Exportada para o admin poder desenhar a régua do calendário com exatamente
 * a mesma regra usada no agendamento.
 */
export function workingWindows(query: {
  dayOfWeek: number;
  schedule: WeeklySchedule[];
  studioHours: StudioHours[];
}): Window[] {
  const { dayOfWeek, schedule, studioHours } = query;

  const daySchedule = schedule.find(
    (entry) => entry.dayOfWeek === dayOfWeek && entry.isActive !== false,
  );
  if (!daySchedule) return [];

  const studioDay = studioHours.find((entry) => entry.dayOfWeek === dayOfWeek);
  // Sem configuração explícita o estúdio é tratado como fechado — falha segura.
  if (!studioDay || !studioDay.isOpen) return [];

  const artistWindow: Window = {
    start: timeToMinutes(daySchedule.startTime),
    end: timeToMinutes(daySchedule.endTime),
  };
  const studioWindow: Window = {
    start: timeToMinutes(studioDay.opensAt),
    end: timeToMinutes(studioDay.closesAt),
  };

  const base = intersect(artistWindow, studioWindow);
  if (!base) return [];

  // Intervalo do artista (almoço/pausa).
  if (daySchedule.breakStart && daySchedule.breakEnd) {
    const breakWindow: Window = {
      start: timeToMinutes(daySchedule.breakStart),
      end: timeToMinutes(daySchedule.breakEnd),
    };
    if (breakWindow.end > breakWindow.start) {
      return subtract(base, breakWindow);
    }
  }

  return [base];
}

/**
 * Horários livres para um artista, num dia, para um serviço.
 *
 * O `endsAt` devolvido já inclui o buffer: é o intervalo que será gravado no
 * agendamento e que bloqueia a agenda.
 */
export function computeSlots(query: SlotQuery): Slot[] {
  const {
    dateISO,
    durationMin,
    bufferMin,
    schedule,
    studioHours,
    busy,
    rules,
    now,
  } = query;

  if (durationMin <= 0) return [];

  const totalMin = durationMin + bufferMin;
  const step = rules.slotStepMin > 0 ? rules.slotStepMin : 30;
  const { timezone } = rules;

  // Dia da semana calculado a partir da data local, sem depender do fuso do
  // processo (em produção o servidor roda em UTC).
  const dayOfWeek = new Date(`${dateISO}T12:00:00Z`).getUTCDay();

  let windows = workingWindows({ dayOfWeek, schedule, studioHours });
  if (windows.length === 0) return [];

  // Converte os intervalos ocupados (UTC) para minutos locais deste dia, para
  // subtrair no mesmo espaço das janelas. Intervalos que atravessam a
  // meia-noite são recortados nas bordas do dia.
  // A borda final é a meia-noite do DIA SEGUINTE, não "+24h": em fusos com
  // horário de verão o dia da virada tem 23 ou 25 horas.
  const dayStartUtc = zonedDateTimeToUtc(dateISO, "00:00", timezone).getTime();
  const dayEndUtc = zonedDateTimeToUtc(addDaysISO(dateISO, 1), "00:00", timezone).getTime();
  const dayLengthMin = Math.round((dayEndUtc - dayStartUtc) / 60_000);

  const busyWindows: Window[] = [];
  for (const interval of busy) {
    const start = interval.startsAt.getTime();
    const end = interval.endsAt.getTime();
    if (end <= dayStartUtc || start >= dayEndUtc) continue;

    busyWindows.push({
      start: Math.max(0, Math.round((start - dayStartUtc) / 60_000)),
      end: Math.min(dayLengthMin, Math.round((end - dayStartUtc) / 60_000)),
    });
  }

  windows = subtractAll(windows, busyWindows).filter((w) => w.end - w.start >= totalMin);
  if (windows.length === 0) return [];

  // Antecedência mínima.
  const earliestStartUtc = now.getTime() + rules.minLeadTimeHours * 3600_000;

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const window of windows) {
    // Alinha o primeiro horário à grade global do dia (múltiplos de `step` a
    // partir da meia-noite), e não ao início da janela. Assim os horários
    // ficam "redondos" (09:00, 09:30) mesmo após uma pausa em 13:20.
    const first = Math.ceil(window.start / step) * step;

    for (let minute = first; minute + totalMin <= window.end; minute += step) {
      if (seen.has(minute)) continue;

      const time = minutesToTime(minute);
      const startsAt = zonedDateTimeToUtc(dateISO, time, timezone);

      if (startsAt.getTime() < earliestStartUtc) continue;

      seen.add(minute);
      slots.push({
        time,
        startsAt,
        endsAt: new Date(startsAt.getTime() + totalMin * 60_000),
      });
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Revalida um horário específico. Usada no servidor antes de gravar: o cliente
 * manda o horário escolhido, mas quem decide se ele ainda é válido é isto.
 */
export function isSlotAvailable(
  query: SlotQuery & { time: string },
): boolean {
  return computeSlots(query).some((slot) => slot.time === query.time);
}

/**
 * Um intervalo candidato conflita com algum intervalo ocupado?
 * Checagem final feita DENTRO da transação, já com o lock do artista tomado.
 */
export function hasConflict(
  candidate: BusyInterval,
  busy: readonly BusyInterval[],
): boolean {
  return busy.some((interval) =>
    overlaps(candidate.startsAt, candidate.endsAt, interval.startsAt, interval.endsAt),
  );
}

/** Há pelo menos um horário livre no dia? Usado para desabilitar datas no calendário. */
export function hasAnySlot(query: SlotQuery): boolean {
  return computeSlots(query).length > 0;
}
