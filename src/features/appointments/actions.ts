"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hasConflict } from "@/lib/availability";
import { AuthorizationError, requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import type { SessionPayload } from "@/lib/auth/session";
import { notify, notifyClient } from "@/lib/notifier";
import { dateISOSchema, timeSchema } from "@/schemas/booking";
import { recomputeSlotsForValidation } from "@/features/booking/queries";
import { formatInStudio, zonedDateTimeToUtc } from "@/lib/datetime";
import { getStudioRules } from "@/features/booking/queries";

/**
 * Ações administrativas sobre agendamentos.
 *
 * Toda ação revalida a sessão (requireUser) antes de escrever: o proxy
 * protege a navegação, mas uma Server Action pode ser invocada diretamente.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Envelope comum: autoriza, executa e converte exceções em resultado tratável. */
async function guarded(
  run: (actor: SessionPayload) => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    return await run(actor);
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
  return guarded(async (actor) => {
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) {
      return { ok: false, error: "Status inválido." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, email: true } },
        service: { select: { name: true } },
        artist: { select: { name: true } },
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

      // Aviso ao cliente, quando ele deixou e-mail.
      if (appointment.client.email) {
        await notifyClient({
          type: isCancelling ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_CONFIRMED",
          appointmentId: id,
          to: appointment.client.email,
          title: isCancelling ? "Agendamento cancelado" : "Horário confirmado",
          message: isCancelling
            ? `Seu horário foi cancelado. Se quiser remarcar, é só falar com a gente.`
            : `Seu horário está confirmado. Nos vemos em breve!`,
          details: [
            { label: "Reserva", value: appointment.code },
            { label: "Serviço", value: appointment.service.name },
            { label: "Artista", value: appointment.artist.name },
            {
              label: "Data",
              value: formatInStudio(appointment.startsAt, "dd/MM/yyyy 'às' HH:mm"),
            },
          ],
        });
      }
    }

    await recordAudit({
      actor,
      action: "STATUS_CHANGE",
      entity: "Appointment",
      entityId: id,
      summary: `Mudou ${appointment.code} de ${appointment.status} para ${parsedStatus.data}${reason ? ` — ${reason}` : ""}.`,
    });

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
  return guarded(async (actor) => {
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

    await recordAudit({
      actor,
      action: "RESCHEDULE",
      entity: "Appointment",
      entityId: current.id,
      summary: `Remarcou ${current.code} para ${parsed.data.dateISO} às ${parsed.data.time}.`,
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
  return guarded(async (actor) => {
    const target = await prisma.appointment.findUnique({
      where: { id },
      select: { code: true },
    });

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

    await recordAudit({
      actor,
      action: "DELETE",
      entity: "Appointment",
      entityId: id,
      summary: `Excluiu o agendamento ${target?.code ?? id}.`,
    });

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
  return guarded(async (actor) => {
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

    await recordAudit({
      actor,
      action: "CREATE",
      entity: "BlockedTime",
      summary: `Bloqueou ${parsed.data.fromDateISO} ${parsed.data.fromTime} → ${parsed.data.toDateISO} ${parsed.data.toTime}${artistId ? "" : " (estúdio inteiro)"}.`,
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
