import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, User } from "lucide-react";

import {
  AdminPageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { AppointmentActions } from "@/features/appointments/components/appointment-actions";
import { RescheduleForm } from "@/features/appointments/components/reschedule-form";
import { InternalNotes } from "@/features/appointments/components/internal-notes";
import { getAppointment } from "@/features/appointments/queries";
import { getBookableArtists } from "@/features/booking/queries";
import { formatInStudio, toDateISO, toTimeString } from "@/lib/datetime";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { whatsappLink } from "@/config/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const appointment = await getAppointment(id);
  return { title: appointment ? `Agendamento ${appointment.code}` : "Agendamento" };
}

export default async function AppointmentDetailPage({ params }: Props) {
  const { id } = await params;
  const [appointment, artists] = await Promise.all([
    getAppointment(id),
    getBookableArtists(),
  ]);

  if (!appointment) notFound();

  const dateISO = toDateISO(appointment.startsAt);
  const time = toTimeString(appointment.startsAt);

  return (
    <>
      <AdminPageHeader
        breadcrumb={{ label: "Agendamentos", href: "/admin/agendamentos" }}
        title={appointment.code}
        description={`Solicitado em ${formatInStudio(appointment.createdAt, "dd/MM/yyyy 'às' HH:mm")} · origem ${appointment.source === "WEBSITE" ? "site" : "painel"}.`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={appointment.status} />
            <AppointmentActions
              id={appointment.id}
              status={appointment.status}
              clientName={appointment.client.name}
              clientPhone={appointment.client.phone}
            />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Detalhes */}
        <div className="space-y-4 xl:col-span-2">
          <Panel>
            <PanelHeader title="Sessão" />
            <dl className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0">
              <DetailRow label="Data" value={formatInStudio(appointment.startsAt, "EEEE, dd/MM/yyyy")} capitalize />
              <DetailRow
                label="Horário"
                value={`${formatInStudio(appointment.startsAt, "HH:mm")} – ${formatInStudio(appointment.endsAt, "HH:mm")}`}
              />
              <DetailRow label="Artista" value={appointment.artist.name} />
              <DetailRow label="Serviço" value={appointment.service.name} />
              <DetailRow
                label="Duração reservada"
                value={`${Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000)} minutos`}
              />
              <DetailRow
                label="Valor estimado"
                value={formatCurrency(appointment.priceEstimate)}
              />
            </dl>

            {appointment.status === "CANCELLED" && appointment.cancelledReason ? (
              <div className="border-t border-hairline px-5 py-4">
                <span className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                  Motivo do cancelamento
                </span>
                <p className="mt-1.5 text-sm text-ash-300">
                  {appointment.cancelledReason}
                </p>
              </div>
            ) : null}
          </Panel>

          {/* Referência do cliente */}
          {appointment.referenceNotes || appointment.referenceImage ? (
            <Panel>
              <PanelHeader
                title="Referência enviada pelo cliente"
                description="Descrição e imagem anexadas no agendamento"
              />
              <div className="space-y-5 p-5">
                {appointment.referenceNotes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ash-300">
                    {appointment.referenceNotes}
                  </p>
                ) : null}

                {appointment.referenceImage ? (
                  <a
                    href={appointment.referenceImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-video w-full max-w-md overflow-hidden border border-hairline bg-ink-800 transition-colors hover:border-hairline-strong"
                  >
                    <Image
                      src={appointment.referenceImage}
                      alt="Imagem de referência enviada pelo cliente"
                      fill
                      sizes="(max-width: 768px) 100vw, 28rem"
                      className="object-contain"
                    />
                  </a>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <RescheduleForm
            id={appointment.id}
            currentArtistId={appointment.artistId}
            currentDateISO={dateISO}
            currentTime={time}
            serviceId={appointment.serviceId}
            artists={artists.map((artist) => ({
              id: artist.id,
              name: artist.name,
              serviceIds: artist.services.map((link) => link.serviceId),
            }))}
          />

          <InternalNotes id={appointment.id} value={appointment.internalNotes ?? ""} />
        </div>

        {/* Cliente */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Cliente" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center border border-hairline bg-ink-800 text-ash-400">
                  <User className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/admin/clientes/${appointment.client.id}`}
                    className="block truncate font-semibold text-bone-100 transition-colors hover:text-blood-400"
                  >
                    {appointment.client.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ash-500">
                    Cliente desde {formatInStudio(appointment.client.createdAt, "MM/yyyy")}
                  </span>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                    Telefone
                  </dt>
                  <dd className="mt-1 text-bone-200">
                    {formatPhone(appointment.client.phone)}
                  </dd>
                </div>
                {appointment.client.email ? (
                  <div>
                    <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                      E-mail
                    </dt>
                    <dd className="mt-1 break-all text-bone-200">
                      {appointment.client.email}
                    </dd>
                  </div>
                ) : null}
                {appointment.client.notes ? (
                  <div>
                    <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                      Observações do cadastro
                    </dt>
                    <dd className="mt-1 text-ash-300">{appointment.client.notes}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-6 space-y-2">
                <Button asChild block size="sm">
                  <a
                    href={whatsappLink(
                      `Olá, ${appointment.client.name.split(" ")[0]}! Aqui é do Ink House, sobre o seu agendamento ${appointment.code}.`,
                      appointment.client.phone,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Responder no WhatsApp
                    <MessageCircle aria-hidden="true" />
                  </a>
                </Button>

                <Button asChild block variant="outline" size="sm">
                  <Link href={`/admin/clientes/${appointment.client.id}`}>
                    Ver histórico do cliente
                  </Link>
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-sm text-bone-100 ${capitalize ? "first-letter:uppercase" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
