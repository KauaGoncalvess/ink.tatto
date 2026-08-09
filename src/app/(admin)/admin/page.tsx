import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleSlash,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  PanelHeader,
  StatCard,
  StatusBadge,
} from "@/components/admin/ui";
import { DashboardCharts } from "@/features/appointments/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import {
  getAppointmentsPerDay,
  getDashboardMetrics,
  getRankings,
} from "@/features/appointments/queries";
import { formatInStudio } from "@/lib/datetime";
import { formatCurrency, formatPhone } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

// Métricas em tempo real: nunca servir de cache.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, perDay, rankings] = await Promise.all([
    getDashboardMetrics(),
    getAppointmentsPerDay(30),
    getRankings(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral da agenda, dos clientes e do faturamento estimado do estúdio."
        action={
          <Button asChild size="sm">
            <Link href="/admin/agendamentos?status=PENDING">
              Ver pendentes
              <CalendarClock aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {/* Métricas */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Agendamentos hoje"
          value={metrics.todayCount}
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          href="/admin/calendario"
        />
        <StatCard
          label="Pendentes"
          value={metrics.pending}
          hint={metrics.pending > 0 ? "Aguardando confirmação" : "Tudo em dia"}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          accent={metrics.pending > 0}
          href="/admin/agendamentos?status=PENDING"
        />
        <StatCard
          label="Confirmados"
          value={metrics.confirmed}
          hint="De hoje em diante"
          icon={<CalendarCheck className="size-4" aria-hidden="true" />}
          href="/admin/agendamentos?status=CONFIRMED"
        />
        <StatCard
          label="Cancelados no mês"
          value={metrics.cancelledThisMonth}
          icon={<CircleSlash className="size-4" aria-hidden="true" />}
          href="/admin/agendamentos?status=CANCELLED"
        />
        <StatCard
          label="Clientes cadastrados"
          value={metrics.clients}
          icon={<Users className="size-4" aria-hidden="true" />}
          href="/admin/clientes"
        />
        <StatCard
          label="Faturamento estimado"
          value={formatCurrency(metrics.estimatedRevenue)}
          hint={`${metrics.completedThisMonth} sessões concluídas no mês`}
          icon={<TrendingUp className="size-4" aria-hidden="true" />}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6">
        <DashboardCharts
          perDay={perDay}
          services={rankings.services}
          artists={rankings.artists}
        />
      </div>

      {/* Próximos agendamentos */}
      <Panel className="mt-6">
        <PanelHeader
          title="Próximos agendamentos"
          description="Pendentes e confirmados nos próximos 30 dias"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/agendamentos">Ver todos</Link>
            </Button>
          }
        />

        {metrics.upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            title="Nenhum agendamento próximo"
            description="Quando um cliente reservar pelo site, ele aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {metrics.upcoming.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/admin/agendamentos/${appointment.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink-850 sm:flex-row sm:items-center sm:gap-5"
                >
                  {/* Data em destaque */}
                  <span className="flex shrink-0 items-baseline gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
                    <span className="font-display text-2xl leading-none text-bone-100">
                      {formatInStudio(appointment.startsAt, "dd/MM")}
                    </span>
                    <span className="text-sm tabular-nums text-blood-500">
                      {formatInStudio(appointment.startsAt, "HH:mm")}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-bone-100">
                      {appointment.client.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-ash-500">
                      {appointment.service.name} · {appointment.artist.name} ·{" "}
                      {formatPhone(appointment.client.phone)}
                    </span>
                  </span>

                  <StatusBadge status={appointment.status} className="self-start sm:self-auto" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
