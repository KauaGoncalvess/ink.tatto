import "server-only";

import type { AppointmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addDaysISO, todayISO, zonedDateTimeToUtc } from "@/lib/datetime";
import { getStudioRules } from "@/features/booking/queries";

/** Consultas de agendamento usadas pelo painel. */

export type AppointmentFilters = {
  status?: AppointmentStatus | "TODOS";
  artistId?: string;
  serviceId?: string;
  search?: string;
  fromISO?: string;
  toISO?: string;
  page?: number;
  perPage?: number;
};

const APPOINTMENT_INCLUDE = {
  client: { select: { id: true, name: true, phone: true, email: true } },
  artist: { select: { id: true, name: true, slug: true } },
  service: { select: { id: true, name: true, durationMin: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

function buildWhere(filters: AppointmentFilters, timezone: string): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (filters.status && filters.status !== "TODOS") {
    where.status = filters.status;
  }
  if (filters.artistId) where.artistId = filters.artistId;
  if (filters.serviceId) where.serviceId = filters.serviceId;

  if (filters.fromISO || filters.toISO) {
    where.startsAt = {};
    if (filters.fromISO) {
      where.startsAt.gte = zonedDateTimeToUtc(filters.fromISO, "00:00", timezone);
    }
    if (filters.toISO) {
      // Fim do dia: início do dia seguinte, exclusivo.
      where.startsAt.lt = zonedDateTimeToUtc(addDaysISO(filters.toISO, 1), "00:00", timezone);
    }
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      { client: { phone: { contains: search.replace(/\D/g, "") } } },
      { client: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function listAppointments(filters: AppointmentFilters = {}) {
  const rules = await getStudioRules();
  const where = buildWhere(filters, rules.timezone);

  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 1, 1);

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getAppointment(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      ...APPOINTMENT_INCLUDE,
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });
}

/** Agendamentos de um intervalo — alimenta o calendário. */
export async function listAppointmentsInRange({
  fromISO,
  toISO,
  artistId,
}: {
  fromISO: string;
  toISO: string;
  artistId?: string;
}) {
  const rules = await getStudioRules();

  return prisma.appointment.findMany({
    where: {
      ...(artistId ? { artistId } : {}),
      startsAt: {
        gte: zonedDateTimeToUtc(fromISO, "00:00", rules.timezone),
        lt: zonedDateTimeToUtc(addDaysISO(toISO, 1), "00:00", rules.timezone),
      },
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: { startsAt: "asc" },
  });
}

/** Bloqueios de um intervalo — exibidos junto no calendário. */
export async function listBlocksInRange({
  fromISO,
  toISO,
  artistId,
}: {
  fromISO: string;
  toISO: string;
  artistId?: string;
}) {
  const rules = await getStudioRules();

  return prisma.blockedTime.findMany({
    where: {
      ...(artistId ? { OR: [{ artistId }, { artistId: null }] } : {}),
      startsAt: { lt: zonedDateTimeToUtc(addDaysISO(toISO, 1), "00:00", rules.timezone) },
      endsAt: { gt: zonedDateTimeToUtc(fromISO, "00:00", rules.timezone) },
    },
    include: { artist: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });
}

/**
 * Métricas do dashboard.
 *
 * Uma única transação para as contagens rodarem no mesmo snapshot — assim os
 * números não se contradizem se um agendamento for criado no meio da leitura.
 */
export async function getDashboardMetrics() {
  const rules = await getStudioRules();
  const today = todayISO(rules.timezone);

  const startOfToday = zonedDateTimeToUtc(today, "00:00", rules.timezone);
  const startOfTomorrow = zonedDateTimeToUtc(addDaysISO(today, 1), "00:00", rules.timezone);
  const startOfMonth = zonedDateTimeToUtc(`${today.slice(0, 7)}-01`, "00:00", rules.timezone);
  const in30Days = zonedDateTimeToUtc(addDaysISO(today, 30), "00:00", rules.timezone);

  const [
    todayCount,
    pending,
    confirmed,
    cancelledThisMonth,
    completedThisMonth,
    clients,
    upcoming,
    revenueRows,
  ] = await prisma.$transaction([
    prisma.appointment.count({
      where: {
        startsAt: { gte: startOfToday, lt: startOfTomorrow },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({
      where: { status: "CONFIRMED", startsAt: { gte: startOfToday } },
    }),
    prisma.appointment.count({
      where: { status: "CANCELLED", startsAt: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: { status: "COMPLETED", startsAt: { gte: startOfMonth } },
    }),
    prisma.client.count(),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: startOfToday, lt: in30Days },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    // Faturamento estimado: soma do preço congelado dos agendamentos do mês
    // que não foram cancelados.
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: startOfMonth, lt: startOfTomorrow },
        status: { in: ["COMPLETED", "CONFIRMED"] },
      },
      select: { priceEstimate: true },
    }),
  ]);

  const estimatedRevenue = revenueRows.reduce((sum, row) => sum + row.priceEstimate, 0);

  return {
    todayCount,
    pending,
    confirmed,
    cancelledThisMonth,
    completedThisMonth,
    clients,
    upcoming,
    estimatedRevenue,
  };
}

/** Série de agendamentos por dia nos últimos N dias — gráfico do dashboard. */
export async function getAppointmentsPerDay(days = 30) {
  const rules = await getStudioRules();
  const today = todayISO(rules.timezone);
  const fromISO = addDaysISO(today, -(days - 1));

  const rows = await prisma.appointment.findMany({
    where: {
      startsAt: {
        gte: zonedDateTimeToUtc(fromISO, "00:00", rules.timezone),
        lt: zonedDateTimeToUtc(addDaysISO(today, 1), "00:00", rules.timezone),
      },
    },
    select: { startsAt: true, status: true },
  });

  // Agrupa no fuso do estúdio, não no do servidor.
  const buckets = new Map<string, { total: number; cancelled: number }>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(addDaysISO(fromISO, i), { total: 0, cancelled: 0 });
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: rules.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const row of rows) {
    const key = formatter.format(row.startsAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (row.status === "CANCELLED") bucket.cancelled += 1;
  }

  return [...buckets.entries()].map(([date, value]) => ({
    date,
    label: `${date.slice(8)}/${date.slice(5, 7)}`,
    total: value.total,
    efetivos: value.total - value.cancelled,
  }));
}

/** Ranking de serviços e artistas — gráficos do dashboard. */
export async function getRankings() {
  const rules = await getStudioRules();
  const today = todayISO(rules.timezone);
  const since = zonedDateTimeToUtc(addDaysISO(today, -90), "00:00", rules.timezone);

  const [byService, byArtist] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { startsAt: { gte: since }, status: { not: "CANCELLED" } },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 6,
    }),
    prisma.appointment.groupBy({
      by: ["artistId"],
      where: { startsAt: { gte: since }, status: { not: "CANCELLED" } },
      _count: { _all: true },
      orderBy: { _count: { artistId: "desc" } },
      take: 6,
    }),
  ]);

  const [services, artists] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: byService.map((row) => row.serviceId) } },
      select: { id: true, name: true },
    }),
    prisma.artist.findMany({
      where: { id: { in: byArtist.map((row) => row.artistId) } },
      select: { id: true, name: true },
    }),
  ]);

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const artistName = new Map(artists.map((a) => [a.id, a.name]));

  return {
    services: byService.map((row) => ({
      name: serviceName.get(row.serviceId) ?? "—",
      total: row._count._all,
    })),
    artists: byArtist.map((row) => ({
      name: artistName.get(row.artistId) ?? "—",
      total: row._count._all,
    })),
  };
}

/** Opções de filtro (artistas e serviços) para as telas de listagem. */
export async function getFilterOptions() {
  const [artists, services] = await Promise.all([
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { artists, services };
}
