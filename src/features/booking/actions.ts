"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hasConflict } from "@/lib/availability";
import { clientIp, hit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAppointmentSchema } from "@/schemas/booking";
import { recomputeSlotsForValidation } from "@/features/booking/queries";
import { notify } from "@/lib/notifier";

/**
 * Criação de agendamento pelo site público.
 *
 * Três camadas de defesa, nesta ordem:
 *   1. Zod valida e normaliza a entrada.
 *   2. O motor recalcula os horários no servidor — o horário que o navegador
 *      mandou é apenas uma sugestão, nunca a verdade.
 *   3. A gravação acontece dentro de uma transação que toma um advisory lock
 *      no artista e revalida o conflito ali dentro. É isso que impede duas
 *      requisições simultâneas de reservarem o mesmo horário: a validação do
 *      passo 2 sozinha tem uma janela de corrida entre "consultei" e "gravei".
 */

export type BookingResult =
  | {
      ok: true;
      appointment: {
        code: string;
        startsAt: string;
        artistName: string;
        serviceName: string;
      };
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0, 1

function generateCode(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `IH-${out}`;
}

/**
 * Converte o id do artista num inteiro de 64 bits estável para o advisory lock.
 * `hashtext` é uma função interna do Postgres, determinística dentro de uma
 * mesma versão — perfeita para este uso, em que só precisamos que o mesmo
 * artista mapeie sempre para a mesma chave.
 */
async function lockArtist(tx: Prisma.TransactionClient, artistId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${artistId}))`;
}

export async function createAppointment(
  input: unknown,
): Promise<BookingResult> {
  // ---- Rate limit --------------------------------------------------------
  const ip = clientIp(await headers());
  const limit = hit(`booking:${ip}`, RATE_LIMITS.booking.limit, RATE_LIMITS.booking.windowMs);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Muitas solicitações seguidas. Tente novamente em ${Math.ceil(limit.retryAfter / 60)} minutos ou fale com o estúdio pelo WhatsApp.`,
    };
  }

  // ---- Validação ---------------------------------------------------------
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      error: "Confira os dados do formulário.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  // ---- Revalidação da disponibilidade no servidor ------------------------
  const slots = await recomputeSlotsForValidation({
    artistId: data.artistId,
    serviceId: data.serviceId,
    dateISO: data.dateISO,
  });

  const slot = slots.find((candidate) => candidate.time === data.time);
  if (!slot) {
    return {
      ok: false,
      error:
        "Este horário não está mais disponível. Escolha outro horário para continuar.",
    };
  }

  const [artist, service] = await Promise.all([
    prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { id: true, name: true },
    }),
    prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { id: true, name: true, priceFrom: true },
    }),
  ]);

  if (!artist || !service) {
    return { ok: false, error: "Artista ou serviço indisponível." };
  }

  // Preço do artista para este serviço, quando houver sobrescrita.
  const link = await prisma.artistService.findUnique({
    where: { artistId_serviceId: { artistId: artist.id, serviceId: service.id } },
    select: { priceFrom: true },
  });

  try {
    const created = await prisma.$transaction(async (tx) => {
      // A partir daqui, nenhuma outra transação consegue criar agendamento
      // para este artista até esta terminar.
      await lockArtist(tx, data.artistId);

      // Revalidação final DENTRO do lock: entre o cálculo acima e este ponto,
      // outra requisição pode ter reservado o mesmo intervalo.
      const conflicting = await tx.appointment.findMany({
        where: {
          artistId: data.artistId,
          status: { not: "CANCELLED" },
          startsAt: { lt: slot.endsAt },
          endsAt: { gt: slot.startsAt },
        },
        select: { id: true, startsAt: true, endsAt: true },
      });

      if (hasConflict({ startsAt: slot.startsAt, endsAt: slot.endsAt }, conflicting)) {
        throw new SlotTakenError();
      }

      // Bloqueios criados no intervalo entre o cálculo e agora.
      const blocking = await tx.blockedTime.findFirst({
        where: {
          OR: [{ artistId: data.artistId }, { artistId: null }],
          startsAt: { lt: slot.endsAt },
          endsAt: { gt: slot.startsAt },
        },
        select: { id: true },
      });
      if (blocking) throw new SlotTakenError();

      // Cliente identificado pelo telefone: reagendar não duplica cadastro.
      const client = await tx.client.upsert({
        where: { phone: data.phone },
        create: {
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
        },
        update: {
          name: data.name,
          // Só preenche o email se o cliente informou um agora — não apaga o
          // que já estava cadastrado.
          ...(data.email ? { email: data.email } : {}),
        },
      });

      if (client.isBlocked) throw new ClientBlockedError();

      // Colisão de código é astronomicamente improvável (32^6), mas o retry
      // torna o caminho determinístico em vez de estourar erro para o cliente.
      let attempts = 0;
      while (true) {
        attempts += 1;
        try {
          return await tx.appointment.create({
            data: {
              code: generateCode(),
              clientId: client.id,
              artistId: artist.id,
              serviceId: service.id,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              status: "PENDING",
              source: "WEBSITE",
              priceEstimate: link?.priceFrom ?? service.priceFrom,
              referenceNotes: data.referenceNotes ?? null,
              referenceImage: data.referenceImage ?? null,
            },
            select: { id: true, code: true, startsAt: true },
          });
        } catch (error) {
          const isDuplicateCode =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";
          if (!isDuplicateCode || attempts >= 5) throw error;
        }
      }
    });

    // Notificação fora da transação: falha de notificação não pode desfazer
    // um agendamento válido.
    await notify({
      type: "APPOINTMENT_CREATED",
      appointmentId: created.id,
      title: "Novo agendamento solicitado",
      message: `${data.name} solicitou ${service.name} com ${artist.name}.`,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin/calendario");

    return {
      ok: true,
      appointment: {
        code: created.code,
        startsAt: created.startsAt.toISOString(),
        artistName: artist.name,
        serviceName: service.name,
      },
    };
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return {
        ok: false,
        error:
          "Alguém acabou de reservar este horário. Escolha outro horário disponível.",
      };
    }
    if (error instanceof ClientBlockedError) {
      return {
        ok: false,
        error:
          "Não foi possível concluir o agendamento online. Entre em contato com o estúdio pelo WhatsApp.",
      };
    }

    console.error("[booking] falha ao criar agendamento", error);
    return {
      ok: false,
      error:
        "Não conseguimos concluir seu agendamento agora. Tente novamente em instantes.",
    };
  }
}

class SlotTakenError extends Error {
  constructor() {
    super("SLOT_TAKEN");
    this.name = "SlotTakenError";
  }
}

class ClientBlockedError extends Error {
  constructor() {
    super("CLIENT_BLOCKED");
    this.name = "ClientBlockedError";
  }
}
