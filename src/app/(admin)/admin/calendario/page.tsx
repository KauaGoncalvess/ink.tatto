import { AdminPageHeader } from "@/components/admin/ui";
import { AdminCalendar } from "@/features/appointments/components/calendar";
import {
  listAppointmentsInRange,
  listBlocksInRange,
} from "@/features/appointments/queries";
import { getFilterOptions } from "@/features/appointments/queries";
import { getStudioRules } from "@/features/booking/queries";
import { addDaysISO, todayISO, toDateISO, toTimeString } from "@/lib/datetime";
import { isValidDateISO } from "@/lib/datetime";

export const metadata = { title: "Calendário" };
export const dynamic = "force-dynamic";

type View = "mes" | "semana" | "dia";

type Props = {
  searchParams: Promise<{ visao?: string; data?: string; artista?: string }>;
};

/** Primeiro dia (domingo) da semana que contém a data. */
function startOfWeek(dateISO: string): string {
  const weekday = new Date(`${dateISO}T12:00:00Z`).getUTCDay();
  return addDaysISO(dateISO, -weekday);
}

/** Intervalo exibido para cada visão. O mês inclui os dias de preenchimento
 *  da primeira e da última semana, para a grade fechar certinho. */
function rangeFor(view: View, anchorISO: string) {
  if (view === "dia") return { fromISO: anchorISO, toISO: anchorISO };

  if (view === "semana") {
    const from = startOfWeek(anchorISO);
    return { fromISO: from, toISO: addDaysISO(from, 6) };
  }

  const firstOfMonth = `${anchorISO.slice(0, 7)}-01`;
  const from = startOfWeek(firstOfMonth);
  return { fromISO: from, toISO: addDaysISO(from, 41) };
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;

  const view: View =
    params.visao === "semana" || params.visao === "dia" ? params.visao : "mes";

  const rules = await getStudioRules();
  const anchorISO =
    params.data && isValidDateISO(params.data) ? params.data : todayISO(rules.timezone);

  const artistId = params.artista || undefined;
  const { fromISO, toISO } = rangeFor(view, anchorISO);

  const [appointments, blocks, options] = await Promise.all([
    listAppointmentsInRange({ fromISO, toISO, artistId }),
    listBlocksInRange({ fromISO, toISO, artistId }),
    getFilterOptions(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Calendário"
        description="Agenda do estúdio por mês, semana ou dia. Clique num horário vago para bloqueá-lo."
      />

      <AdminCalendar
        view={view}
        anchorISO={anchorISO}
        artistId={artistId ?? ""}
        artists={options.artists}
        fromISO={fromISO}
        toISO={toISO}
        // Serializado para o cliente: Date não atravessa a fronteira RSC
        // preservando o fuso, então normalizamos aqui, no fuso do estúdio.
        appointments={appointments.map((appointment) => ({
          id: appointment.id,
          code: appointment.code,
          dateISO: toDateISO(appointment.startsAt, rules.timezone),
          startTime: toTimeString(appointment.startsAt, rules.timezone),
          endTime: toTimeString(appointment.endsAt, rules.timezone),
          status: appointment.status,
          clientName: appointment.client.name,
          artistName: appointment.artist.name,
          artistId: appointment.artistId,
          serviceName: appointment.service.name,
        }))}
        blocks={blocks.map((block) => ({
          id: block.id,
          dateISO: toDateISO(block.startsAt, rules.timezone),
          endDateISO: toDateISO(block.endsAt, rules.timezone),
          startTime: toTimeString(block.startsAt, rules.timezone),
          endTime: toTimeString(block.endsAt, rules.timezone),
          reason: block.reason,
          note: block.note,
          artistName: block.artist?.name ?? null,
        }))}
        studioHours={rules.studioHours}
      />
    </>
  );
}
