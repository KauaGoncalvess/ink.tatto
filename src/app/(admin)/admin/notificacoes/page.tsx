import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  History,
  Mail,
  Smartphone,
} from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  PanelHeader,
  Tag,
} from "@/components/admin/ui";
import { MarkAllReadButton } from "@/features/admin/components/mark-all-read-button";
import { prisma } from "@/lib/prisma";
import { listAudit } from "@/lib/audit";
import { emailEnabled } from "@/lib/notifier";
import { formatInStudio } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AuditAction, NotificationChannel } from "@prisma/client";

export const metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

const CHANNEL_ICON: Record<NotificationChannel, typeof Bell> = {
  IN_APP: Bell,
  EMAIL: Mail,
  WHATSAPP: Smartphone,
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Criou",
  UPDATE: "Editou",
  DELETE: "Excluiu",
  STATUS_CHANGE: "Mudou status",
  RESCHEDULE: "Remarcou",
  LOGIN: "Entrou",
};

export default async function NotificationsPage() {
  const [notifications, audit] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        appointment: {
          select: { id: true, code: true, client: { select: { name: true } } },
        },
      },
    }),
    listAudit({ limit: 60 }),
  ]);

  const unread = notifications.filter((item) => item.readAt === null).length;

  return (
    <>
      <AdminPageHeader
        title="Notificações"
        description="Eventos do sistema e histórico de alterações feitas pela equipe."
        action={unread > 0 ? <MarkAllReadButton count={unread} /> : undefined}
      />

      {/* Estado do canal de e-mail — evita a dúvida "o cliente recebeu?" */}
      <div
        className={cn(
          "mb-4 flex items-start gap-3 border px-4 py-3 text-sm",
          emailEnabled
            ? "border-status-confirmed/40 bg-status-confirmed/10 text-status-confirmed"
            : "border-status-pending/40 bg-status-pending/10 text-status-pending",
        )}
      >
        {emailEnabled ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        <p>
          {emailEnabled
            ? "Envio de e-mail ativo. Clientes recebem confirmação e cancelamento automaticamente."
            : "Envio de e-mail desativado — defina RESEND_API_KEY e EMAIL_FROM para notificar os clientes automaticamente. Enquanto isso, use o botão de WhatsApp em cada agendamento."}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Eventos"
            description={`${unread} não ${unread === 1 ? "lido" : "lidos"}`}
          />

          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="size-5" aria-hidden="true" />}
              title="Nenhuma notificação"
              description="Novos agendamentos e mudanças de status aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {notifications.map((item) => {
                const Icon = CHANNEL_ICON[item.channel];
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 px-5 py-4",
                      item.readAt === null && "bg-ink-850",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center border",
                        item.error
                          ? "border-blood-700 text-blood-400"
                          : item.readAt === null
                            ? "border-blood-700 text-blood-500"
                            : "border-hairline text-ash-600",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-bone-100">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ash-400">{item.message}</p>

                      {item.error ? (
                        <p className="mt-1.5 text-xs text-blood-400">
                          Falha na entrega: {item.error}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                          {formatInStudio(item.createdAt, "dd/MM 'às' HH:mm")}
                        </span>
                        {item.sentAt ? <Tag>entregue</Tag> : null}
                        {item.appointment ? (
                          <Link
                            href={`/admin/agendamentos/${item.appointment.id}`}
                            className="text-[0.625rem] uppercase tracking-[0.14em] text-blood-400 hover:text-blood-300"
                          >
                            {item.appointment.code}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Histórico de alterações"
            description="Quem alterou o quê no painel"
          />

          {audit.length === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden="true" />}
              title="Nenhuma alteração registrada"
              description="As ações feitas no painel aparecem aqui a partir de agora."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {audit.map((entry) => (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-bone-100">{entry.summary}</p>
                      <p className="mt-1 text-xs text-ash-500">
                        {entry.userName} ·{" "}
                        {formatInStudio(entry.createdAt, "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                    <Tag className="shrink-0">{ACTION_LABELS[entry.action]}</Tag>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
