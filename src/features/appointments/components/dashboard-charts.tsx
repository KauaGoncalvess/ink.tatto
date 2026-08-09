"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Panel, PanelHeader } from "@/components/admin/ui";

/**
 * Gráficos do dashboard.
 *
 * Três, deliberadamente: evolução no tempo, ranking de serviços e ranking de
 * artistas. Um painel de tatuagem não precisa de mais — o que o estúdio olha
 * todo dia é a tabela de agendamentos, não o gráfico.
 *
 * A paleta segue os tokens do projeto: vermelho só na série principal, cinzas
 * no resto, sem legenda colorida competindo com o conteúdo.
 */

type PerDay = { date: string; label: string; total: number; efetivos: number };
type Ranking = { name: string; total: number };

const AXIS = {
  stroke: "#4a4a52",
  fontSize: 11,
  fontFamily: "var(--font-inter), sans-serif",
};

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-hairline-strong bg-ink-800 px-3 py-2 text-xs shadow-none">
      <p className="font-semibold text-bone-100">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="mt-1 text-ash-300">
          {entry.name ? `${entry.name}: ` : ""}
          <span className="font-semibold text-bone-100">{entry.value}</span>
          {suffix ? ` ${suffix}` : ""}
        </p>
      ))}
    </div>
  );
}

export function DashboardCharts({
  perDay,
  services,
  artists,
}: {
  perDay: PerDay[];
  services: Ranking[];
  artists: Ranking[];
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {/* Evolução */}
      <Panel className="xl:col-span-2">
        <PanelHeader
          title="Agendamentos por dia"
          description="Últimos 30 dias, excluindo cancelados"
        />
        <div className="p-4 pt-6">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={perDay} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="fill-appointments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8102e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#c8102e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1c1c21" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                // Em 30 dias, um rótulo a cada 4 evita sobreposição no mobile.
                interval={3}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                allowDecimals={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "#4a4a52", strokeWidth: 1 }}
                content={<ChartTooltip />}
              />
              <Area
                type="monotone"
                dataKey="efetivos"
                name="Agendamentos"
                stroke="#c8102e"
                strokeWidth={2}
                fill="url(#fill-appointments)"
                dot={false}
                activeDot={{ r: 3, fill: "#c8102e", stroke: "#08080a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <RankingChart
        title="Serviços mais procurados"
        description="Últimos 90 dias"
        data={services}
      />
      <RankingChart
        title="Artistas mais agendados"
        description="Últimos 90 dias"
        data={artists}
      />
    </div>
  );
}

function RankingChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Ranking[];
}) {
  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <div className="p-4 pt-6">
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-ash-600">
            Ainda não há dados suficientes.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="#1c1c21" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ ...AXIS, fill: "#a8a8b0" }}
                width={120}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={<ChartTooltip suffix="agendamentos" />}
              />
              <Bar dataKey="total" name="Total" barSize={14}>
                {data.map((entry, index) => (
                  // Só o primeiro colocado recebe o vermelho — o ranking se lê
                  // pela ordem, não por cinco cores diferentes.
                  <Cell
                    key={entry.name}
                    fill={index === 0 ? "#c8102e" : "#35353d"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
