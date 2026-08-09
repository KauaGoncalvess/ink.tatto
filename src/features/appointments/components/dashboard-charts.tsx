"use client";

import * as React from "react";

import { Panel, PanelHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Gráficos do dashboard, escritos à mão.
 *
 * Três, deliberadamente: evolução no tempo, ranking de serviços e ranking de
 * artistas. Um painel de tatuagem não precisa de mais — o que o estúdio olha
 * todo dia é a tabela de agendamentos, não o gráfico.
 *
 * Por que sem biblioteca: o Recharts custava 370 kB de JS só nesta rota, mais
 * do que o site público inteiro, para desenhar uma área e duas barras. A
 * medição está em `npm run perf`. Aqui a evolução é um `<path>` de SVG e os
 * rankings são barras de CSS — juntos, alguns kB.
 *
 * Cada gráfico é `role="img"` com resumo em `aria-label` e traz a mesma série
 * numa tabela só para leitor de tela: gráfico é representação, não conteúdo.
 * A paleta segue os tokens do projeto — vermelho só na série principal.
 */

type PerDay = { date: string; label: string; total: number; efetivos: number };
type Ranking = { name: string; total: number };

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
      <Panel className="xl:col-span-2">
        <PanelHeader
          title="Agendamentos por dia"
          description="Últimos 30 dias, excluindo cancelados"
        />
        <div className="p-4 pt-6">
          <TrendChart data={perDay} />
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

// ---------------------------------------------------------------------------
// Evolução
// ---------------------------------------------------------------------------

// Coordenadas do viewBox. O SVG escala por CSS (width: 100%), então estes são
// números de desenho, não pixels de tela — o traço fica nítido em qualquer
// largura por causa de `vector-effect: non-scaling-stroke`.
const W = 720;
const H = 220;
const PAD = { top: 12, right: 10, bottom: 26, left: 34 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Arredonda o topo do eixo para um número redondo (1, 2, 5, 10, 20…). */
function niceCeil(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function TrendChart({ data }: { data: PerDay[] }) {
  const [hover, setHover] = React.useState<number | null>(null);

  if (data.length === 0) {
    return <EmptyChart />;
  }

  const max = niceCeil(Math.max(...data.map((day) => day.efetivos), 1));
  const total = data.reduce((sum, day) => sum + day.efetivos, 0);

  const x = (index: number) =>
    data.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index * PLOT_W) / (data.length - 1);
  const y = (value: number) => PAD.top + (1 - value / max) * PLOT_H;

  const points = data.map((day, index) => `${x(index)},${y(day.efetivos)}`);
  const line = `M${points.join(" L")}`;
  const area = `${line} L${x(data.length - 1)},${PAD.top + PLOT_H} L${x(0)},${
    PAD.top + PLOT_H
  } Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => max * fraction);
  const active = hover !== null ? data[hover] : null;

  /** Índice do dia mais próximo do ponteiro, em coordenadas do viewBox. */
  function indexFromPointer(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const viewBoxX = ((event.clientX - box.left) / box.width) * W;
    const ratio = (viewBoxX - PAD.left) / PLOT_W;
    const index = Math.round(ratio * (data.length - 1));
    return Math.min(data.length - 1, Math.max(0, index));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Agendamentos por dia nos últimos ${data.length} dias, ${total} no total. Pico de ${Math.max(
          ...data.map((day) => day.efetivos),
        )} em um único dia.`}
        onPointerMove={(event) => setHover(indexFromPointer(event))}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fill-appointments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-blood-500)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-blood-500)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grade e eixo Y */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-ink-700)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-ash-500)"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#fill-appointments)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-blood-500)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Rótulos do eixo X — um a cada quatro dias, senão empilham no mobile */}
        {data.map((day, index) =>
          index % 4 === 0 ? (
            <text
              key={day.date}
              x={x(index)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-ash-500)"
            >
              {day.label}
            </text>
          ) : null,
        )}

        {active && hover !== null ? (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--color-ash-600)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(hover)}
              cy={y(active.efetivos)}
              r={4}
              fill="var(--color-blood-500)"
              stroke="var(--color-ink-950)"
              strokeWidth={2}
            />
          </g>
        ) : null}
      </svg>

      {active && hover !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 -translate-x-1/2 border border-hairline-strong bg-ink-800 px-3 py-2 text-xs"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            // Perto das bordas o balão sairia do painel; o clamp resolve sem
            // precisar medir o próprio balão.
            transform: `translateX(${hover === 0 ? "0" : hover === data.length - 1 ? "-100%" : "-50%"})`,
          }}
        >
          <p className="font-semibold text-bone-100">{active.label}</p>
          <p className="mt-1 text-ash-300">
            Agendamentos:{" "}
            <span className="font-semibold text-bone-100">{active.efetivos}</span>
          </p>
        </div>
      ) : null}

      <DataTable
        caption="Agendamentos por dia"
        head={["Dia", "Agendamentos"]}
        rows={data.map((day) => [day.label, String(day.efetivos)])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

function RankingChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Ranking[];
}) {
  const max = Math.max(...data.map((entry) => entry.total), 1);

  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <div className="p-4 pt-6">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ol className="space-y-3">
            {data.map((entry, index) => (
              <li key={entry.name} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 truncate text-xs text-ash-300">
                    {entry.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-bone-100">
                    {entry.total}
                  </span>
                </div>
                {/* Trilho + preenchimento: barra de CSS, sem SVG e sem lib. */}
                <div className="h-2 bg-ink-800">
                  <div
                    className={cn(
                      "h-full",
                      // Só o primeiro colocado recebe o vermelho — o ranking se
                      // lê pela ordem, não por cinco cores diferentes.
                      index === 0 ? "bg-blood-500" : "bg-ash-700",
                    )}
                    style={{ width: `${Math.max(2, (entry.total / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function EmptyChart() {
  return (
    <p className="py-10 text-center text-sm text-ash-500">
      Ainda não há dados suficientes.
    </p>
  );
}

/** Mesma série do gráfico, em tabela, exposta só para leitor de tela. */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            <th scope="row">{row[0]}</th>
            {row.slice(1).map((cell, index) => (
              <td key={index}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
