"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hasConflict } from "@/lib/availability";
import { AuthorizationError, requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifier";
import { formatInStudio, zonedDateTimeToUtc } from "@/lib/datetime";
import { formatCurrency } from "@/lib/utils";
import { getStudioRules, recomputeSlotsForValidation } from "@/features/booking/queries";
import {
  adminCreateAppointmentSchema,
  adminEditAppointmentSchema,
  parsePriceToCents,
} from "@/schemas/appointment-admin";

/**
 * Criação e edição de agendamentos pelo próprio estúdio.
 *
 * Separado de `features/booking/actions.ts` (que atende o visitante) porque as
 * regras são diferentes de propósito:
 *
 *  - o estúdio pode marcar para um cliente já cadastrado, sem redigitar dados;
 *  - pode forçar um encaixe fora da grade padrão do artista;
 *  - escolhe o status inicial e pode sobrescrever o preço.
 *
 * O que NÃO muda: a proibição de sobrepor outro agendamento. Marcar por
 * telefone é uma exceção de agenda, não uma licença para overbooking — por
 * isso o mesmo advisory lock e a mesma revalidação dentro da transação.
 */

export type AdminAppointmentResult =
  | { ok: true; id: string; code: string; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `IH-${out}`;
}

class ConflictError extends Error {
  constructor() {
    super("CONFLICT");
    this.name = "ConflictError";
  }
}

function fieldErrorsFrom(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    result[issue.path.map(String).join(".")] ??= issue.message;
  }
  return result;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/clientes");
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export async function createAppointmentAsAdmin(
  input: unknown,
): Promise<AdminAppointmentResult> {
  let actor;
  try {
    actor = await requireUser();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof AuthorizationError
          ? error.message
          : "Não foi possível autorizar a operação.",
    };
  }

  const parsed = adminCreateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados do formulário.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const data = parsed.data;

  const [artist, service] = await Promise.all([
    prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { id: true, name: true },
    }),
    prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { id: true, name: true, durationMin: true, bufferMin: true, priceFrom: true },
    }),
  ]);

  if (!artist || !service) {
    return { ok: false, error: "Artista ou serviço não encontrado." };
  }

  const rules = await getStudioRules();
  const startsAt = zonedDateTimeToUtc(data.dateISO, data.time, rules.timezone);
  const endsAt = new Date(
    startsAt.getTime() + (service.durationMin + service.bufferMin) * 60_000,
  );

  // Fora da grade padrão só passa quando o operador marcou o encaixe
  // explicitamente — evita erro de digitação virar sessão às 3h da manhã.
  const slots = await recomputeSlotsForValidation({
    artistId: data.artistId,
    serviceId: data.serviceId,
    dateISO: data.dateISO,
  });
  const withinSchedule = slots.some((slot) => slot.time === data.time);

  if (!withinSchedule && !data.allowOutsideSchedule) {
    return {
      ok: false,
      error:
        "Este horário está fora da grade do artista. Marque “permitir encaixe” para confirmar mesmo assim.",
    };
  }

  const priceOverride = parsePriceToCents(data.priceOverride);
  if (data.priceOverride && priceOverride === null) {
    return {
      ok: false,
      error: "Valor inválido.",
      fieldErrors: { priceOverride: "Use apenas números, como 350 ou 350,00." },
    };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.artistId}))`;

      const conflicting = await tx.appointment.findMany({
        where: {
          artistId: data.artistId,
          status: { not: "CANCELLED" },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { startsAt: true, endsAt: true },
      });

      if (hasConflict({ startsAt, endsAt }, conflicting)) throw new ConflictError();

      // Cliente existente ou novo cadastro.
      const client =
        data.client.mode === "existing"
          ? await tx.client.findUnique({
              where: { id: data.client.clientId },
              select: { id: true, name: true },
            })
          : await tx.client.upsert({
              where: { phone: data.client.phone },
              create: {
                name: data.client.name,
                phone: data.client.phone,
                email: data.client.email ?? null,
              },
              update: {
                name: data.client.name,
                ...(data.client.email ? { email: data.client.email } : {}),
              },
              select: { id: true, name: true },
            });

      if (!client) throw new Error("CLIENT_NOT_FOUND");

      const link = await tx.artistService.findUnique({
        where: {
          artistId_serviceId: { artistId: artist.id, serviceId: service.id },
        },
        select: { priceFrom: true },
      });

      let attempts = 0;
      while (true) {
        attempts += 1;
        try {
          const appointment = await tx.appointment.create({
            data: {
              code: generateCode(),
              clientId: client.id,
              artistId: artist.id,
              serviceId: service.id,
              startsAt,
              endsAt,
              status: data.status,
              source: "ADMIN",
              priceEstimate: priceOverride ?? link?.priceFrom ?? service.priceFrom,
              referenceNotes: data.referenceNotes ?? null,
              internalNotes: data.internalNotes ?? null,
            },
            select: { id: true, code: true },
          });
          return { appointment, clientName: client.name };
        } catch (error) {
          const duplicateCode =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";
          if (!duplicateCode || attempts >= 5) throw error;
        }
      }
    });

    await recordAudit({
      actor,
      action: "CREATE",
      entity: "Appointment",
      entityId: created.appointment.id,
      summary: `Agendou ${created.clientName} — ${service.name} com ${artist.name} em ${formatInStudio(startsAt, "dd/MM/yyyy 'às' HH:mm", rules.timezone)}${withinSchedule ? "" : " (encaixe)"}.`,
    });

    await notify({
      type: "APPOINTMENT_CREATED",
      appointmentId: created.appointment.id,
      title: "Agendamento criado pelo painel",
      message: `${created.clientName} — ${service.name} com ${artist.name}.`,
    });

    revalidateAdmin();

    return {
      ok: true,
      id: created.appointment.id,
      code: created.appointment.code,
      message: withinSchedule
        ? "Agendamento criado."
        : "Agendamento criado como encaixe, fora da grade padrão do artista.",
    };
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        ok: false,
        error: "Já existe um agendamento neste horário para este artista.",
      };
    }
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return { ok: false, error: "Cliente não encontrado." };
    }
    console.error("[admin] falha ao criar agendamento", error);
    return { ok: false, error: "Não foi possível criar o agendamento." };
  }
}

// ---------------------------------------------------------------------------
// Edição completa
// ---------------------------------------------------------------------------

export async function editAppointment(
  input: unknown,
): Promise<AdminAppointmentResult> {
  let actor;
  try {
    actor = await requireUser();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof AuthorizationError
          ? error.message
          : "Não foi possível autorizar a operação.",
    };
  }

  const parsed = adminEditAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados do formulário.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const data = parsed.data;

  const current = await prisma.appointment.findUnique({
    where: { id: data.id },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
      artist: { select: { name: true } },
    },
  });
  if (!current) return { ok: false, error: "Agendamento não encontrado." };

  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    select: { id: true, name: true, durationMin: true, bufferMin: true, priceFrom: true },
  });
  if (!service) return { ok: false, error: "Serviço não encontrado." };

  const rules = await getStudioRules();
  const startsAt = zonedDateTimeToUtc(data.dateISO, data.time, rules.timezone);
  // Trocar o serviço muda a duração, e portanto o fim da sessão.
  const endsAt = new Date(
    startsAt.getTime() + (service.durationMin + service.bufferMin) * 60_000,
  );

  const price = parsePriceToCents(data.priceEstimate);
  if (data.priceEstimate && price === null) {
    return {
      ok: false,
      error: "Valor inválido.",
      fieldErrors: { priceEstimate: "Use apenas números, como 350 ou 350,00." },
    };
  }

  const isCancelling = data.status === "CANCELLED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.artistId}))`;

      // Cancelado não ocupa a agenda, então não precisa checar conflito.
      if (!isCancelling) {
        const conflicting = await tx.appointment.findMany({
          where: {
            artistId: data.artistId,
            id: { not: data.id },
            status: { not: "CANCELLED" },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { startsAt: true, endsAt: true },
        });
        if (hasConflict({ startsAt, endsAt }, conflicting)) throw new ConflictError();
      }

      await tx.appointment.update({
        where: { id: data.id },
        data: {
          clientId: data.clientId,
          artistId: data.artistId,
          serviceId: data.serviceId,
          startsAt,
          endsAt,
          status: data.status,
          priceEstimate: price ?? current.priceEstimate,
          internalNotes: data.internalNotes ?? null,
          cancelledAt: isCancelling ? (current.cancelledAt ?? new Date()) : null,
          cancelledReason: isCancelling ? (data.cancelledReason ?? null) : null,
        },
      });
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        ok: false,
        error: "Já existe um agendamento neste horário para este artista.",
      };
    }
    console.error("[admin] falha ao editar agendamento", error);
    return { ok: false, error: "Não foi possível salvar as alterações." };
  }

  // Resumo legível do que mudou de fato — é o que dá valor à auditoria.
  const changes: string[] = [];
  if (current.serviceId !== data.serviceId) {
    changes.push(`serviço ${current.service.name} → ${service.name}`);
  }
  if (current.artistId !== data.artistId) changes.push("artista");
  if (current.startsAt.getTime() !== startsAt.getTime()) {
    changes.push(
      `horário → ${formatInStudio(startsAt, "dd/MM/yyyy HH:mm", rules.timezone)}`,
    );
  }
  if (current.status !== data.status) {
    changes.push(`status ${current.status} → ${data.status}`);
  }
  if (price !== null && price !== current.priceEstimate) {
    changes.push(`valor → ${formatCurrency(price)}`);
  }
  if (current.clientId !== data.clientId) changes.push("cliente");

  await recordAudit({
    actor,
    action: "UPDATE",
    entity: "Appointment",
    entityId: data.id,
    summary:
      changes.length > 0
        ? `Editou ${current.code}: ${changes.join(", ")}.`
        : `Editou ${current.code} (sem mudanças relevantes).`,
  });

  revalidateAdmin();
  revalidatePath(`/admin/agendamentos/${data.id}`);

  return {
    ok: true,
    id: data.id,
    code: current.code,
    message: "Agendamento atualizado.",
  };
}

// ---------------------------------------------------------------------------
// Busca de clientes (autocomplete do formulário)
// ---------------------------------------------------------------------------

export async function searchClients(term: string) {
  try {
    await requireUser();
  } catch {
    return [];
  }

  const search = term.trim();
  if (search.length < 2) return [];

  return prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search.replace(/\D/g, "") || " " } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, phone: true, email: true, isBlocked: true },
  });
}
