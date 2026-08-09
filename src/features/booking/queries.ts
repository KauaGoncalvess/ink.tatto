import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  computeSlots,
  type BusyInterval,
  type Slot,
  type StudioHours,
  type WeeklySchedule,
} from "@/lib/availability";
import { addDaysISO, todayISO } from "@/lib/datetime";
import { siteConfig } from "@/config/site";

/**
 * Camada de acesso a dados do agendamento.
 *
 * Responsável por buscar no banco e delegar toda a regra para o motor puro em
 * src/lib/availability.ts. Nenhuma decisão de disponibilidade é tomada aqui.
 */

export type StudioRules = {
  slotStepMin: number;
  minLeadTimeHours: number;
  maxAdvanceDays: number;
  timezone: string;
  studioHours: StudioHours[];
};

/**
 * Configurações do estúdio + funcionamento.
 *
 * `cache` do React deduplica a chamada dentro de um mesmo render: a página de
 * agendamento consulta isto várias vezes e só uma query chega ao banco.
 */
export const getStudioRules = cache(async (): Promise<StudioRules> => {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: "studio" },
    include: { openingHours: { orderBy: { dayOfWeek: "asc" } } },
  });

  // Sem configuração no banco (primeira execução), assume um padrão seguro:
  // o estúdio fechado só impediria agendamentos, nunca criaria um inválido.
  if (!settings) {
    return {
      slotStepMin: 30,
      minLeadTimeHours: 12,
      maxAdvanceDays: 90,
      timezone: siteConfig.timezone,
      studioHours: [],
    };
  }

  return {
    slotStepMin: settings.slotStepMin,
    minLeadTimeHours: settings.minLeadTimeHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    timezone: settings.timezone,
    studioHours: settings.openingHours.map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      isOpen: entry.isOpen,
      opensAt: entry.opensAt,
      closesAt: entry.closesAt,
    })),
  };
});

/** Serviços ativos, ordenados para exibição. */
export const getBookableServices = cache(async () => {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      durationMin: true,
      bufferMin: true,
      priceFrom: true,
      icon: true,
    },
  });
});

/** Artistas que aceitam agendamento, opcionalmente filtrados por serviço. */
export const getBookableArtists = cache(async (serviceId?: string) => {
  return prisma.artist.findMany({
    where: {
      isActive: true,
      acceptsBooking: true,
      ...(serviceId ? { services: { some: { serviceId } } } : {}),
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      handle: true,
      shortBio: true,
      avatarUrl: true,
      specialties: true,
      services: { select: { serviceId: true, priceFrom: true } },
    },
  });
});

/**
 * Tudo que o motor precisa para calcular a agenda de um artista num intervalo.
 * Uma única ida ao banco por artista, independentemente de quantos dias.
 */
async function loadArtistAgenda(artistId: string, fromISO: string, toISO: string) {
  const rangeStart = new Date(`${fromISO}T00:00:00.000Z`);
  // Margem de um dia em cada ponta cobre a diferença de fuso sem lógica extra.
  const rangeEnd = new Date(`${addDaysISO(toISO, 2)}T00:00:00.000Z`);
  const paddedStart = new Date(rangeStart.getTime() - 48 * 3600_000);

  const [artist, appointments, blocks] = await Promise.all([
    prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        name: true,
        isActive: true,
        acceptsBooking: true,
        availability: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        artistId,
        // Cancelado libera o horário; no-show não, porque a sessão de fato
        // ocupou a agenda naquele dia.
        status: { not: "CANCELLED" },
        startsAt: { gte: paddedStart, lt: rangeEnd },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.blockedTime.findMany({
      where: {
        // artistId nulo = bloqueio do estúdio inteiro, vale para todos.
        OR: [{ artistId }, { artistId: null }],
        startsAt: { lt: rangeEnd },
        endsAt: { gt: paddedStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  if (!artist) return null;

  const busy: BusyInterval[] = [
    ...appointments.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt })),
    ...blocks.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
  ];

  const schedule: WeeklySchedule[] = artist.availability.map((entry) => ({
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakStart: entry.breakStart,
    breakEnd: entry.breakEnd,
    isActive: entry.isActive,
  }));

  return { artist, busy, schedule };
}

export type AvailabilityRequest = {
  artistId: string;
  serviceId: string;
  dateISO: string;
};

export type AvailabilityResponse = {
  slots: { time: string; startsAt: string }[];
  /** Motivo de não haver horários, quando aplicável. */
  reason?: string;
};

/** Horários livres de um artista num dia, para um serviço. */
export async function getAvailableSlots({
  artistId,
  serviceId,
  dateISO,
}: AvailabilityRequest): Promise<AvailabilityResponse> {
  const rules = await getStudioRules();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, isActive: true },
    select: { durationMin: true, bufferMin: true },
  });
  if (!service) return { slots: [], reason: "Serviço indisponível." };

  const today = todayISO(rules.timezone);
  if (dateISO < today) {
    return { slots: [], reason: "Esta data já passou." };
  }
  if (dateISO > addDaysISO(today, rules.maxAdvanceDays)) {
    return {
      slots: [],
      reason: `Agendamentos são abertos com até ${rules.maxAdvanceDays} dias de antecedência.`,
    };
  }

  const agenda = await loadArtistAgenda(artistId, dateISO, dateISO);
  if (!agenda || !agenda.artist.isActive || !agenda.artist.acceptsBooking) {
    return { slots: [], reason: "Este artista não está aceitando agendamentos." };
  }

  const slots = computeSlots({
    dateISO,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    schedule: agenda.schedule,
    studioHours: rules.studioHours,
    busy: agenda.busy,
    rules: {
      slotStepMin: rules.slotStepMin,
      minLeadTimeHours: rules.minLeadTimeHours,
      timezone: rules.timezone,
    },
    now: new Date(),
  });

  if (slots.length === 0) {
    const worksThisDay = agenda.schedule.some(
      (entry) =>
        entry.dayOfWeek === new Date(`${dateISO}T12:00:00Z`).getUTCDay() &&
        entry.isActive !== false,
    );
    return {
      slots: [],
      reason: worksThisDay
        ? "Todos os horários deste dia já foram preenchidos."
        : "Este artista não atende neste dia da semana.",
    };
  }

  return {
    slots: slots.map((slot) => ({
      time: slot.time,
      startsAt: slot.startsAt.toISOString(),
    })),
  };
}

/**
 * Quais dias de um intervalo têm pelo menos um horário livre.
 * Alimenta o calendário do wizard, que desabilita as datas sem vaga.
 */
export async function getAvailableDays({
  artistId,
  serviceId,
  fromISO,
  toISO,
}: {
  artistId: string;
  serviceId: string;
  fromISO: string;
  toISO: string;
}): Promise<string[]> {
  const rules = await getStudioRules();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, isActive: true },
    select: { durationMin: true, bufferMin: true },
  });
  if (!service) return [];

  const agenda = await loadArtistAgenda(artistId, fromISO, toISO);
  if (!agenda || !agenda.artist.isActive || !agenda.artist.acceptsBooking) return [];

  const today = todayISO(rules.timezone);
  const start = fromISO < today ? today : fromISO;
  const maxISO = addDaysISO(today, rules.maxAdvanceDays);
  const end = toISO > maxISO ? maxISO : toISO;

  const available: string[] = [];
  const now = new Date();

  for (let dateISO = start; dateISO <= end; dateISO = addDaysISO(dateISO, 1)) {
    const slots = computeSlots({
      dateISO,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      schedule: agenda.schedule,
      studioHours: rules.studioHours,
      busy: agenda.busy,
      rules: {
        slotStepMin: rules.slotStepMin,
        minLeadTimeHours: rules.minLeadTimeHours,
        timezone: rules.timezone,
      },
      now,
    });

    if (slots.length > 0) available.push(dateISO);
  }

  return available;
}

/** Slots já materializados — usado no servidor antes de gravar. */
export async function recomputeSlotsForValidation({
  artistId,
  serviceId,
  dateISO,
}: AvailabilityRequest): Promise<Slot[]> {
  const rules = await getStudioRules();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, isActive: true },
    select: { durationMin: true, bufferMin: true },
  });
  if (!service) return [];

  const agenda = await loadArtistAgenda(artistId, dateISO, dateISO);
  if (!agenda || !agenda.artist.isActive || !agenda.artist.acceptsBooking) return [];

  return computeSlots({
    dateISO,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    schedule: agenda.schedule,
    studioHours: rules.studioHours,
    busy: agenda.busy,
    rules: {
      slotStepMin: rules.slotStepMin,
      minLeadTimeHours: rules.minLeadTimeHours,
      timezone: rules.timezone,
    },
    now: new Date(),
  });
}
