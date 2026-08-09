import "server-only";

import type { NotificationChannel, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Camada de notificação.
 *
 * O adapter padrão persiste no banco (alimentando o sino do painel admin) e
 * registra no log. Não há envio real de e-mail/SMS porque o projeto não recebe
 * credenciais de provedor — e inventar um envio que falha silenciosamente
 * seria pior do que não ter.
 *
 * Para plugar um provedor real, implemente `NotificationAdapter` e registre em
 * `adapters`. Nada no domínio muda: `notify()` continua sendo a única porta.
 *
 *   // exemplo com Resend
 *   adapters.EMAIL = {
 *     async send(payload) {
 *       await resend.emails.send({ ... });
 *     },
 *   };
 */

export type NotifyPayload = {
  type: NotificationType;
  title: string;
  message: string;
  appointmentId?: string;
  channel?: NotificationChannel;
};

export type NotificationAdapter = {
  send(payload: NotifyPayload): Promise<void>;
};

/** Adapter in-app: o registro no banco É a entrega. */
const inAppAdapter: NotificationAdapter = {
  async send() {
    // Nada a fazer — a linha em `notifications` já é o que o painel lê.
  },
};

export const adapters: Partial<Record<NotificationChannel, NotificationAdapter>> = {
  IN_APP: inAppAdapter,
};

/**
 * Registra e tenta entregar uma notificação.
 * Nunca lança: uma falha de notificação não pode derrubar a operação de
 * negócio que a originou.
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const channel = payload.channel ?? "IN_APP";

  try {
    const record = await prisma.notification.create({
      data: {
        type: payload.type,
        channel,
        title: payload.title,
        message: payload.message,
        appointmentId: payload.appointmentId ?? null,
      },
      select: { id: true },
    });

    const adapter = adapters[channel];
    if (!adapter) return;

    try {
      await adapter.send(payload);
      await prisma.notification.update({
        where: { id: record.id },
        data: { sentAt: new Date() },
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: record.id },
        data: { error: error instanceof Error ? error.message : "Falha desconhecida" },
      });
    }
  } catch (error) {
    console.error("[notifier] não foi possível registrar a notificação", error);
  }
}

/** Notificações não lidas — badge do painel. */
export async function countUnreadNotifications(): Promise<number> {
  return prisma.notification.count({ where: { readAt: null } });
}
