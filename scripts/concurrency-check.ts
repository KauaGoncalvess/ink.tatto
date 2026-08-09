/**
 * Teste de concorrência da criação de agendamento.
 *
 * Dispara N tentativas SIMULTÂNEAS para o mesmo artista, serviço e horário e
 * confirma que exatamente uma vence. É a prova de que o advisory lock em
 * `createAppointment` funciona: sem ele, a janela entre "consultei a agenda" e
 * "gravei o agendamento" permitiria overbooking sob carga.
 *
 * Roda contra o banco diretamente (mesma transação usada pela Server Action),
 * o que torna o teste determinístico e independente do servidor HTTP.
 *
 * Uso: npx tsx scripts/concurrency-check.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

import { computeSlots } from "../src/lib/availability";
import { addDaysISO, todayISO } from "../src/lib/datetime";

const prisma = new PrismaClient();

const ATTEMPTS = 8;

/** Réplica exata do caminho crítico de src/features/booking/actions.ts. */
async function attemptBooking(
  index: number,
  artistId: string,
  serviceId: string,
  clientId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<"criado" | "conflito" | "erro"> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${artistId}))`;

      const conflicting = await tx.appointment.findFirst({
        where: {
          artistId,
          status: { not: "CANCELLED" },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });

      if (conflicting) throw new Error("SLOT_TAKEN");

      await tx.appointment.create({
        data: {
          code: `CC-${String(index).padStart(4, "0")}`,
          clientId,
          artistId,
          serviceId,
          startsAt,
          endsAt,
          status: "PENDING",
          source: "WEBSITE",
          priceEstimate: 0,
        },
      });
    });
    return "criado";
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") return "conflito";
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "conflito";
    }
    console.error(`  tentativa ${index} falhou:`, error);
    return "erro";
  }
}

async function main() {
  // Escolhe um artista/serviço reais e um horário livre no futuro.
  const artist = await prisma.artist.findFirst({
    where: { isActive: true, acceptsBooking: true, services: { some: {} } },
    include: {
      availability: true,
      services: { include: { service: true } },
    },
  });
  if (!artist) throw new Error("Nenhum artista com serviço cadastrado. Rode o seed.");

  const service = artist.services[0]!.service;

  const openingHours = await prisma.openingHour.findMany();
  const studioHours = openingHours.map((entry) => ({
    dayOfWeek: entry.dayOfWeek,
    isOpen: entry.isOpen,
    opensAt: entry.opensAt,
    closesAt: entry.closesAt,
  }));

  const busy = await prisma.appointment.findMany({
    where: { artistId: artist.id, status: { not: "CANCELLED" } },
    select: { startsAt: true, endsAt: true },
  });
  const blocks = await prisma.blockedTime.findMany({
    where: { OR: [{ artistId: artist.id }, { artistId: null }] },
    select: { startsAt: true, endsAt: true },
  });

  const today = todayISO();
  let slot: { startsAt: Date; endsAt: Date } | null = null;

  for (let offset = 1; offset <= 60 && !slot; offset += 1) {
    const slots = computeSlots({
      dateISO: addDaysISO(today, offset),
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      schedule: artist.availability.map((entry) => ({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakStart: entry.breakStart,
        breakEnd: entry.breakEnd,
        isActive: entry.isActive,
      })),
      studioHours,
      busy: [...busy, ...blocks],
      rules: { slotStepMin: 30, minLeadTimeHours: 0, timezone: "America/Sao_Paulo" },
      now: new Date(),
    });
    if (slots.length > 0) slot = slots[0]!;
  }

  if (!slot) throw new Error("Nenhum horário livre encontrado nos próximos 60 dias.");

  const client = await prisma.client.findFirst();
  if (!client) throw new Error("Nenhum cliente cadastrado. Rode o seed.");

  console.log(
    `Disparando ${ATTEMPTS} reservas simultâneas para ${artist.name} · ${service.name}`,
  );
  console.log(`Horário alvo: ${slot.startsAt.toISOString()}\n`);

  // Limpa resíduo de execuções anteriores.
  await prisma.appointment.deleteMany({ where: { code: { startsWith: "CC-" } } });

  const results = await Promise.all(
    Array.from({ length: ATTEMPTS }, (_, index) =>
      attemptBooking(index, artist.id, service.id, client.id, slot!.startsAt, slot!.endsAt),
    ),
  );

  const created = results.filter((r) => r === "criado").length;
  const conflicts = results.filter((r) => r === "conflito").length;
  const errors = results.filter((r) => r === "erro").length;

  console.log(`  criados:   ${created}`);
  console.log(`  conflitos: ${conflicts}`);
  console.log(`  erros:     ${errors}`);

  // Confirmação independente: quantos existem de fato no intervalo?
  const persisted = await prisma.appointment.count({
    where: {
      artistId: artist.id,
      status: { not: "CANCELLED" },
      startsAt: { lt: slot.endsAt },
      endsAt: { gt: slot.startsAt },
    },
  });

  // Limpa o que o teste criou.
  await prisma.appointment.deleteMany({ where: { code: { startsWith: "CC-" } } });

  const ok = created === 1 && errors === 0 && persisted === 1;

  console.log(
    `\n${ok ? "✔" : "✗"} exatamente ${persisted} agendamento persistido no horário (esperado: 1)`,
  );

  if (!ok) {
    console.error("\nFALHA: a prevenção de conflito não segurou sob concorrência.");
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
