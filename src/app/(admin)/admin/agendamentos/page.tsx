import Link from "next/link";
import { CalendarDays } from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  StatusBadge,
  Td,
  TableWrap,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { AppointmentFilters } from "@/features/appointments/components/appointment-filters";
import { AppointmentActions } from "@/features/appointments/components/appointment-actions";
import { NewAppointmentDialog } from "@/features/appointments/components/new-appointment-dialog";
import { ExportCsvButton } from "@/features/appointments/components/export-csv-button";
import { getFilterOptions, listAppointments } from "@/features/appointments/queries";
import { getBookableArtists, getBookableServices } from "@/features/booking/queries";
import { formatInStudio } from "@/lib/datetime";
import { formatCurrency, formatPhone } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";

export const metadata = { title: "Agendamentos" };
export const dynamic = "force-dynamic";

const VALID_STATUS = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

type Props = {
  searchParams: Promise<{
    status?: string;
    artista?: string;
    servico?: string;
    busca?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  }>;
};

export default async function AppointmentsPage({ searchParams }: Props) {
  const params = await searchParams;

  const status = VALID_STATUS.includes(params.status as (typeof VALID_STATUS)[number])
    ? (params.status as AppointmentStatus)
    : "TODOS";

  const page = Number.parseInt(params.pagina ?? "1", 10);

  const [
    { items, total, pageCount, page: currentPage },
    options,
    bookableArtists,
    bookableServices,
  ] = await Promise.all([
    listAppointments({
      status,
      artistId: params.artista || undefined,
      serviceId: params.servico || undefined,
      search: params.busca || undefined,
      fromISO: params.de || undefined,
      toISO: params.ate || undefined,
      page: Number.isFinite(page) ? page : 1,
    }),
    getFilterOptions(),
    getBookableArtists(),
    getBookableServices(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Agendamentos"
        description={`${total} ${total === 1 ? "registro encontrado" : "registros encontrados"} com os filtros atuais.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton />
            <NewAppointmentDialog
              artists={bookableArtists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                serviceIds: artist.services.map((link) => link.serviceId),
              }))}
              services={bookableServices.map((service) => ({
                id: service.id,
                name: service.name,
                durationMin: service.durationMin,
              }))}
            />
          </div>
        }
      />

      <AppointmentFilters artists={options.artists} services={options.services} />

      <Panel className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            title="Nenhum agendamento encontrado"
            description="Ajuste os filtros ou limpe a busca para ver todos os registros."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/agendamentos">Limpar filtros</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabela — desktop */}
            <TableWrap>
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Telefone</Th>
                  <Th>Artista</Th>
                  <Th>Serviço</Th>
                  <Th>Data</Th>
                  <Th>Horário</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((appointment) => (
                  <tr key={appointment.id} className="transition-colors hover:bg-ink-850">
                    <Td>
                      <Link
                        href={`/admin/agendamentos/${appointment.id}`}
                        className="font-medium text-bone-100 transition-colors hover:text-blood-400"
                      >
                        {appointment.client.name}
                      </Link>
                      <span className="mt-0.5 block text-[0.625rem] uppercase tracking-wider text-ash-600">
                        {appointment.code}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ash-400">
                      {formatPhone(appointment.client.phone)}
                    </Td>
                    <Td className="text-ash-300">{appointment.artist.name}</Td>
                    <Td className="text-ash-300">
                      {appointment.service.name}
                      <span className="mt-0.5 block text-[0.625rem] text-ash-600">
                        {formatCurrency(appointment.priceEstimate)}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums text-ash-300">
                      {formatInStudio(appointment.startsAt, "dd/MM/yyyy")}
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums text-ash-300">
                      {formatInStudio(appointment.startsAt, "HH:mm")}
                    </Td>
                    <Td>
                      <StatusBadge status={appointment.status} />
                    </Td>
                    <Td className="text-right">
                      <AppointmentActions
                        id={appointment.id}
                        status={appointment.status}
                        clientName={appointment.client.name}
                        clientPhone={appointment.client.phone}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>

            {/* Cards — mobile. Layout próprio, não a tabela encolhida. */}
            <ul className="divide-y divide-hairline md:hidden">
              {items.map((appointment) => (
                <li key={appointment.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/agendamentos/${appointment.id}`}
                        className="block truncate font-semibold text-bone-100"
                      >
                        {appointment.client.name}
                      </Link>
                      <span className="mt-0.5 block text-[0.625rem] uppercase tracking-wider text-ash-600">
                        {appointment.code}
                      </span>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-ash-600">Data</dt>
                      <dd className="mt-0.5 tabular-nums text-ash-300">
                        {formatInStudio(appointment.startsAt, "dd/MM/yyyy 'às' HH:mm")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ash-600">Telefone</dt>
                      <dd className="mt-0.5 text-ash-300">
                        {formatPhone(appointment.client.phone)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ash-600">Artista</dt>
                      <dd className="mt-0.5 truncate text-ash-300">
                        {appointment.artist.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ash-600">Serviço</dt>
                      <dd className="mt-0.5 truncate text-ash-300">
                        {appointment.service.name}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex justify-end">
                    <AppointmentActions
                      id={appointment.id}
                      status={appointment.status}
                      clientName={appointment.client.name}
                      clientPhone={appointment.client.phone}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {pageCount > 1 ? (
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          params={params}
        />
      ) : null}
    </>
  );
}

function Pagination({
  currentPage,
  pageCount,
  params,
}: {
  currentPage: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  const buildHref = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "pagina") search.set(key, value);
    }
    search.set("pagina", String(page));
    return `/admin/agendamentos?${search}`;
  };

  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex items-center justify-between gap-4"
    >
      <Button
        asChild={currentPage > 1}
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
      >
        {currentPage > 1 ? (
          <Link href={buildHref(currentPage - 1)}>Anterior</Link>
        ) : (
          <span>Anterior</span>
        )}
      </Button>

      <span className="text-xs tabular-nums text-ash-500">
        Página {currentPage} de {pageCount}
      </span>

      <Button
        asChild={currentPage < pageCount}
        variant="outline"
        size="sm"
        disabled={currentPage >= pageCount}
      >
        {currentPage < pageCount ? (
          <Link href={buildHref(currentPage + 1)}>Próxima</Link>
        ) : (
          <span>Próxima</span>
        )}
      </Button>
    </nav>
  );
}
