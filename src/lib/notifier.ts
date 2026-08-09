import "server-only";

import type { NotificationChannel, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

/**
 * Camada de notificação.
 *
 * Dois canais:
 *
 *   IN_APP  o registro no banco É a entrega — alimenta o sino do painel.
 *           Sempre ativo, sem configuração.
 *   EMAIL   envio real via Resend, ativado por RESEND_API_KEY. Sem a chave o
 *           canal fica inerte e a notificação continua registrada no banco;
 *           nada quebra, nada falha em silêncio.
 *
 * `notify()` nunca lança: uma falha de notificação não pode derrubar a
 * operação de negócio que a originou (um agendamento válido não pode ser
 * desfeito porque o e-mail não saiu).
 */

export type NotifyPayload = {
  type: NotificationType;
  title: string;
  message: string;
  appointmentId?: string;
  channel?: NotificationChannel;
  /** Destinatário do e-mail. Sem ele, o canal EMAIL é ignorado. */
  to?: string | null;
  /** Bloco de detalhes exibido no corpo do e-mail. */
  details?: { label: string; value: string }[];
  /** Chamada para ação no fim do e-mail. */
  action?: { label: string; url: string };
};

export type NotificationAdapter = {
  send(payload: NotifyPayload): Promise<void>;
};

/** Adapter in-app: o registro no banco já é a entrega. */
const inAppAdapter: NotificationAdapter = {
  async send() {
    // Nada a fazer — a linha em `notifications` é o que o painel lê.
  },
};

// ---------------------------------------------------------------------------
// E-mail (Resend)
// ---------------------------------------------------------------------------

/**
 * Template do e-mail.
 *
 * HTML com estilos inline porque cliente de e-mail não carrega CSS externo,
 * ignora a maior parte das folhas e frequentemente descarta `<style>` no
 * `<head>`. Também acompanha uma versão em texto puro: sem ela, filtros de
 * spam penalizam a mensagem.
 */
function renderEmail(payload: NotifyPayload): { html: string; text: string } {
  const rows = (payload.details ?? [])
    .map(
      (detail) => `
        <tr>
          <td style="padding:8px 0;color:#8a8a93;font-size:13px;">${escapeHtml(detail.label)}</td>
          <td style="padding:8px 0;color:#f2f0ed;font-size:13px;text-align:right;">${escapeHtml(detail.value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#08080a;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0d0d10;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="padding:32px 32px 0;">
          <div style="width:48px;height:2px;background:#c8102e;"></div>
          <p style="margin:20px 0 0;color:#6b6b73;font-size:11px;letter-spacing:3px;text-transform:uppercase;">
            ${escapeHtml(siteConfig.studioName)} ${escapeHtml(siteConfig.studioTagline)}
          </p>
          <h1 style="margin:12px 0 0;color:#f2f0ed;font-size:24px;line-height:1.2;text-transform:uppercase;">
            ${escapeHtml(payload.title)}
          </h1>
          <p style="margin:16px 0 0;color:#a8a8b0;font-size:14px;line-height:1.7;">
            ${escapeHtml(payload.message)}
          </p>
        </td></tr>

        ${
          rows
            ? `<tr><td style="padding:24px 32px 0;">
                 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                        style="border-top:1px solid rgba(255,255,255,0.08);">
                   ${rows}
                 </table>
               </td></tr>`
            : ""
        }

        ${
          payload.action
            ? `<tr><td style="padding:28px 32px 0;">
                 <a href="${escapeHtml(payload.action.url)}"
                    style="display:inline-block;background:#c8102e;color:#f2f0ed;padding:14px 28px;
                           font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;
                           text-decoration:none;">${escapeHtml(payload.action.label)}</a>
               </td></tr>`
            : ""
        }

        <tr><td style="padding:32px;">
          <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);
                    color:#4a4a52;font-size:11px;line-height:1.7;">
            ${escapeHtml(siteConfig.contact.address.street)} — ${escapeHtml(siteConfig.contact.address.city)}<br>
            ${escapeHtml(siteConfig.contact.phone)} · ${escapeHtml(siteConfig.contact.email)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${siteConfig.studioName} — ${payload.title}`,
    "",
    payload.message,
    "",
    ...(payload.details ?? []).map((d) => `${d.label}: ${d.value}`),
    ...(payload.action ? ["", `${payload.action.label}: ${payload.action.url}`] : []),
    "",
    `${siteConfig.contact.phone} · ${siteConfig.contact.email}`,
  ].join("\n");

  return { html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

export const emailEnabled = Boolean(resendApiKey && emailFrom);

const emailAdapter: NotificationAdapter = {
  async send(payload) {
    if (!emailEnabled) {
      throw new Error(
        "Canal de e-mail não configurado (defina RESEND_API_KEY e EMAIL_FROM).",
      );
    }
    if (!payload.to) {
      throw new Error("Notificação por e-mail sem destinatário.");
    }

    const { html, text } = renderEmail(payload);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [payload.to],
        subject: `${payload.title} · ${siteConfig.studioName}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend respondeu ${response.status}: ${detail.slice(0, 200)}`);
    }
  },
};

export const adapters: Partial<Record<NotificationChannel, NotificationAdapter>> = {
  IN_APP: inAppAdapter,
  EMAIL: emailAdapter,
  // WHATSAPP: implemente um adapter (Twilio, Z-API…) e registre aqui.
};

// ---------------------------------------------------------------------------

/** Registra e tenta entregar uma notificação. Nunca lança. */
export async function notify(payload: NotifyPayload): Promise<void> {
  const channel = payload.channel ?? "IN_APP";

  // E-mail sem configuração ou sem destinatário: registra como in-app para o
  // painel não perder o evento, em vez de falhar em silêncio.
  const effectiveChannel: NotificationChannel =
    channel === "EMAIL" && (!emailEnabled || !payload.to) ? "IN_APP" : channel;

  try {
    const record = await prisma.notification.create({
      data: {
        type: payload.type,
        channel: effectiveChannel,
        title: payload.title,
        message: payload.message,
        appointmentId: payload.appointmentId ?? null,
      },
      select: { id: true },
    });

    const adapter = adapters[effectiveChannel];
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

/**
 * Avisa o cliente por e-mail sobre o próprio agendamento.
 *
 * Separado de `notify()` (que registra eventos internos) porque o público é
 * outro: aqui o destinatário é o cliente, não o estúdio.
 */
export async function notifyClient(payload: NotifyPayload): Promise<void> {
  await notify({ ...payload, channel: "EMAIL" });
}

/** Notificações não lidas — badge do painel. */
export async function countUnreadNotifications(): Promise<number> {
  return prisma.notification.count({ where: { readAt: null } });
}
