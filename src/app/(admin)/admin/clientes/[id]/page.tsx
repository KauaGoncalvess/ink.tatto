import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarDays, Mail, MessageCircle, Phone } from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  PanelHeader,
  StatCard,
  StatusBadge,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/features/admin/components/client-dialog";
import { prisma } from "@/lib/prisma";
import { formatInStudio } from "@/lib/datetime";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { whatsappLink } from "@/config/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: client?.name ?? "Cliente" };
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startsAt: "desc" },
        include: {
          artist: { select: { name: true } },
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!client) notFound();

  const completed = client.appointments.filter((a) => a.status === "COMPLETED");
  const totalSpent = completed.reduce((sum, a) => sum + a.priceEstimate, 0);
  const noShows = client.appointments.filter((a) => a.status === "NO_SHOW").length;

  return (
    <>
      <AdminPageHeader
        breadcrumb={{ label: "Clientes", href: "/admin/clientes" }}
        title={client.name}
        description={`Cliente desde ${formatInStudio(client.createdAt, "MMMM 'de' yyyy")}.`}
        action={
          <ClientDialog
            mode="edit"
            client={{
              id: client.id,
              name: client.name,
              phone: client.phone,
              email: client.email ?? "",
              notes: client.notes ?? "",
              isBlocked: client.isBlocked,
            }}
          />
        }
      />

      {client.isBlocked ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
        >
          <Ban className="size-4 shrink-0" aria-hidden="true" />
          Este cliente está bloqueado para agendamento online.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Contato */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Contato" />
            <div className="space-y-4 p-5">
              <ContactLine
                Icon={Phone}
                label="Telefone"
                value={formatPhone(client.phone)}
              />
              {client.email ? (
                <ContactLine Icon={Mail} label="E-mail" value={client.email} />
              ) : null}

              <Button asChild block size="sm">
                <a
                  href={whatsappLink(
                    `Olá, ${client.name.split(" ")[0]}! Aqui é do Ink House.`,
                    client.phone,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar no WhatsApp
                  <MessageCircle aria-hidden="true" />
                </a>
              </Button>
            </div>
          </Panel>

          {client.notes ? (
            <Panel>
              <PanelHeader title="Observações" />
              <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ash-300">
                {client.notes}
              </p>
            </Panel>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Sessões concluídas" value={completed.length} />
            <StatCard label="Total investido" value={formatCurrency(totalSpent)} />
            {noShows > 0 ? (
              <StatCard label="Não compareceu" value={noShows} accent />
            ) : null}
          </div>
        </div>

        {/* Histórico */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Histórico de agendamentos"
            description={`${client.appointments.length} registro(s)`}
          />

          {client.appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" aria-hidden="true" />}
              title="Nenhum agendamento"
              description="Este cliente ainda não tem sessões registradas."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {client.appointments.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    href={`/admin/agendamentos/${appointment.id}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink-850 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <span className="flex shrink-0 items-baseline gap-2 sm:w-24 sm:flex-col sm:items-start sm:gap-0.5">
                      <span className="font-display text-xl leading-none text-bone-100">
                        {formatInStudio(appointment.startsAt, "dd/MM/yy")}
                      </span>
                      <span className="text-xs tabular-nums text-blood-500">
                        {formatInStudio(appointment.startsAt, "HH:mm")}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-bone-100">
                        {appointment.service.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-ash-500">
                        {appointment.artist.name} · {appointment.code} ·{" "}
                        {formatCurrency(appointment.priceEstimate)}
                      </span>
                    </span>

                    <StatusBadge
                      status={appointment.status}
                      className="self-start sm:self-auto"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function ContactLine({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden />
      <div className="min-w-0">
        <span className="block text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
          {label}
        </span>
        <span className="mt-1 block break-all text-sm text-bone-200">{value}</span>
      </div>
    </div>
  );
}
