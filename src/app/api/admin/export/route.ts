import { requireUser } from "@/lib/auth/guards";
import { listAppointments } from "@/features/appointments/queries";
import { STATUS_LABELS } from "@/components/admin/ui";
import { formatInStudio } from "@/lib/datetime";
import { formatPhone } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";

/**
 * Exportação de agendamentos em CSV.
 *
 * Respeita exatamente os mesmos filtros da tela — o operador exporta o que
 * está vendo. Sai em UTF-8 com BOM e separado por ponto e vírgula porque o
 * Excel em português assume esse formato; sem o BOM, acentos viram lixo.
 */

export const dynamic = "force-dynamic";

/**
 * Escapa um campo de CSV.
 *
 * O prefixo com apóstrofo em valores começando por = + - @ evita injeção de
 * fórmula: uma planilha abriria `=CMD(...)` como fórmula executável.
 */
function csvField(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch {
    return new Response("Não autorizado.", { status: 401 });
  }

  const params = new URL(request.url).searchParams;

  const validStatus = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ] as const;
  const statusParam = params.get("status");
  const status = validStatus.includes(statusParam as (typeof validStatus)[number])
    ? (statusParam as AppointmentStatus)
    : "TODOS";

  const { items } = await listAppointments({
    status,
    artistId: params.get("artista") ?? undefined,
    serviceId: params.get("servico") ?? undefined,
    search: params.get("busca") ?? undefined,
    fromISO: params.get("de") ?? undefined,
    toISO: params.get("ate") ?? undefined,
    page: 1,
    // Exportação não é listagem paginada: leva tudo que casa com o filtro.
    perPage: 100,
  });

  const header = [
    "Código",
    "Data",
    "Início",
    "Fim",
    "Cliente",
    "Telefone",
    "E-mail",
    "Artista",
    "Serviço",
    "Status",
    "Valor (R$)",
    "Origem",
    "Criado em",
  ];

  const rows = items.map((appointment) =>
    [
      appointment.code,
      formatInStudio(appointment.startsAt, "dd/MM/yyyy"),
      formatInStudio(appointment.startsAt, "HH:mm"),
      formatInStudio(appointment.endsAt, "HH:mm"),
      appointment.client.name,
      formatPhone(appointment.client.phone),
      appointment.client.email ?? "",
      appointment.artist.name,
      appointment.service.name,
      STATUS_LABELS[appointment.status],
      // Vírgula decimal: é o que o Excel pt-BR entende como número.
      (appointment.priceEstimate / 100).toFixed(2).replace(".", ","),
      appointment.source === "WEBSITE" ? "Site" : "Painel",
      formatInStudio(appointment.createdAt, "dd/MM/yyyy HH:mm"),
    ].map(csvField).join(";"),
  );

  // BOM UTF-8 — sem ele o Excel lê o arquivo como Latin-1 e quebra os acentos.
  const csv = `﻿${[header.map(csvField).join(";"), ...rows].join("\r\n")}`;

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamentos-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
