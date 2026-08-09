"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hasConflict } from "@/lib/availability";
import { AuthorizationError, requireUser } from "@/lib/auth/guards";
import { notify } from "@/lib/notifier";
import { dateISOSchema, timeSchema } from "@/schemas/booking";
import { recomputeSlotsForValidation } from "@/features/booking/queries";
import { zonedDateTimeToUtc } from "@/lib/datetime";
import { getStudioRules } from "@/features/booking/queries";

/**
 * Ações administrativas sobre agendamentos.
 *
 * Toda ação revalida a sessão (requireUser) antes de escrever: o middleware
 * protege a navegação, mas uma Server Action pode ser invocada diretamente.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Envelope comum: autoriza, executa e converte exceções em resultado tratável. */
async function guarded(
  run: () => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    await requireUser();
    return await run();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, error: error.message };
    }
    console.error("[appointments] ação falhou", error);
    return { ok: false, error: "Não foi possível concluir a operação." };
  }
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/clientes");
}

const statusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<ActionResult> {
  return guarded(async () => {
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) {
      return { ok: false, error: "Status inválido." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    });
    if (!appointment) return { ok: false, error: "Agendamento não encontrado." };

    const isCancelling = parsedStatus.data === "CANCELLED";

    await prisma.appointment.update({
      where: { id },
      data: {
        status: parsedStatus.data,
        cancelledAt: isCancelling ? new Date() : null,
        cancelledReason: isCancelling ? (reason?.trim() || null) : null,
      },
    });

    if (parsedStatus.data === "CONFIRMED" || isCancelling) {
      await notify({
        type: isCancelling ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_CONFIRMED",
        appointmentId: id,
        title: isCancelling ? "Agendamento cancelado" : "Agendamento confirmado",
        message: `${appointment.client.name} — ${appointment.service.name}`,
      });
    }

    revalidateAdmin();
    return { ok: true, message: "Status atualizado." };
  });
}

const rescheduleSchema = z.object({
  id: z.string().min(1),
  dateISO: dateISOSchema,
  time: timeSchema,
  artistId: z.string().min(1).optional(),
});

/**
 * Remarcação.
 *
 * Passa pelo mesmo motor de disponibilidade do site público e pelo mesmo
 * advisory lock — remarcar pelo painel não pode furar a fila nem criar
 * sobreposição. A única diferença: o próprio agendamento é excluído da
 * verificação de conflito, senão ele colidiria consigo mesmo.
 */
export async function rescheduleAppointment(
  input: unknown,
): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = rescheduleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const current = await prisma.appointment.findUnique({
      where: { id: parsed.data.id },
      include: { service: true },
    });
    if (!current) return { ok: false, error: "Agendamento não encontrado." };

    const artistId = parsed.data.artistId ?? current.artistId;
    const rules = await getStudioRules();

    const startsAt = zonedDateTimeToUtc(parsed.data.dateISO, parsed.data.time, rules.timezone);
    const endsAt = new Date(
      startsAt.getTime() + (current.service.durationMin + current.service.bufferMin) * 60_000,
    );

    // Verificação "está dentro do expediente?" usando o motor. Se o horário
    // pedido não está na grade, ainda assim permitimos — o estúdio pode
    // encaixar fora do padrão — mas conflito real com outro agendamento não.
    const slots = await recomputeSlotsForValidation({
      artistId,
      serviceId: current.serviceId,
      dateISO: parsed.data.dateISO,
    });
    const withinSchedule = slots.some((slot) => slot.time === parsed.data.time);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${artistId}))`;

        const conflicting = await tx.appointment.findMany({
          where: {
            artistId,
            id: { not: current.id },
            status: { not: "CANCELLED" },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { startsAt: true, endsAt: true },
        });

        if (hasConflict({ startsAt, endsAt }, conflicting)) {
          throw new ConflictError();
        }

        await tx.appointment.update({
          where: { id: current.id },
          data: { artistId, startsAt, endsAt, cancelledAt: null, cancelledReason: null },
        });
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        return {
          ok: false,
          error: "Já existe um agendamento neste horário para este artista.",
        };
      }
      throw error;
    }

    await notify({
      type: "APPOINTMENT_RESCHEDULED",
      appointmentId: current.id,
      title: "Agendamento remarcado",
      message: `Novo horário: ${parsed.data.dateISO} às ${parsed.data.time}.`,
    });

    revalidateAdmin();
    return {
      ok: true,
      message: withinSchedule
        ? "Agendamento remarcado."
        : "Agendamento remarcado (encaixe fora da grade padrão do artista).",
    };
  });
}

const notesSchema = z.object({
  id: z.string().min(1),
  internalNotes: z.string().trim().max(2000).optional(),
});

export async function updateAppointmentNotes(input: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = notesSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Anotação inválida." };

    await prisma.appointment.update({
      where: { id: parsed.data.id },
      data: { internalNotes: parsed.data.internalNotes || null },
    });

    revalidatePath(`/admin/agendamentos/${parsed.data.id}`);
    return { ok: true, message: "Anotações salvas." };
  });
}

export async function deleteAppointment(id: string): Promise<ActionResult> {
  return guarded(async () => {
    try {
      await prisma.appointment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return { ok: false, error: "Agendamento não encontrado." };
      }
      throw error;
    }

    revalidateAdmin();
    return { ok: true, message: "Agendamento excluído." };
  });
}

// ---------------------------------------------------------------------------
// Bloqueios de horário
// ---------------------------------------------------------------------------

const blockSchema = z
  .object({
    artistId: z.string().optional(),
    fromDateISO: dateISOSchema,
    fromTime: timeSchema,
    toDateISO: dateISOSchema,
    toTime: timeSchema,
    reason: z.enum(["DAY_OFF", "VACATION", "BREAK", "APPOINTMENT_HOLD", "OTHER"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine(
    (data) =>
      `${data.fromDateISO}T${data.fromTime}` < `${data.toDateISO}T${data.toTime}`,
    { message: "O fim do bloqueio precisa ser depois do início.", path: ["toTime"] },
  );

export async function createBlockedTime(input: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = blockSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const rules = await getStudioRules();
    const startsAt = zonedDateTimeToUtc(
      parsed.data.fromDateISO,
      parsed.data.fromTime,
      rules.timezone,
    );
    const endsAt = zonedDateTimeToUtc(
      parsed.data.toDateISO,
      parsed.data.toTime,
      rules.timezone,
    );

    const artistId = parsed.data.artistId || null;

    // Avisa (sem impedir) se o bloqueio cobre agendamentos já marcados: cabe
    // ao estúdio decidir se remarca ou cancela.
    const affected = await prisma.appointment.count({
      where: {
        ...(artistId ? { artistId } : {}),
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    await prisma.blockedTime.create({
      data: {
        artistId,
        startsAt,
        endsAt,
        reason: parsed.data.reason,
        note: parsed.data.note || null,
      },
    });

    revalidateAdmin();
    return {
      ok: true,
      message:
        affected > 0
          ? `Bloqueio criado. Atenção: ${affected} agendamento(s) já marcado(s) caem neste período.`
          : "Bloqueio criado.",
    };
  });
}

export async function deleteBlockedTime(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await prisma.blockedTime.delete({ where: { id } });
    revalidateAdmin();
    return { ok: true, message: "Bloqueio removido." };
  });
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

export async function markNotificationsRead(): Promise<ActionResult> {
  return guarded(async () => {
    await prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

class ConflictError extends Error {
  constructor() {
    super("CONFLICT");
    this.name = "ConflictError";
  }
}
