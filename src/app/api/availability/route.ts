import { NextResponse } from "next/server";

import { availabilityQuerySchema, availableDaysQuerySchema } from "@/schemas/booking";
import { getAvailableDays, getAvailableSlots } from "@/features/booking/queries";
import { clientIp, hit } from "@/lib/rate-limit";

/**
 * Consulta pública de disponibilidade.
 *
 * GET /api/availability?artistId&serviceId&dateISO       → horários do dia
 * GET /api/availability?artistId&serviceId&fromISO&toISO → dias com vaga
 *
 * É leitura, mas ainda assim passa por rate limit: a consulta faz várias
 * queries e um laço por dia no segundo modo, então merece proteção contra
 * scraping agressivo.
 */

// Depende do estado atual da agenda — nunca deve ser servida de cache.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const limit = await hit(`availability:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { slots: [], reason: "Muitas consultas. Aguarde um instante." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);

  // Modo "dias com vaga" — usado pelo calendário do wizard.
  if ("fromISO" in params || "toISO" in params) {
    const parsed = availableDaysQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { days: [], reason: "Parâmetros inválidos." },
        { status: 400 },
      );
    }

    const days = await getAvailableDays(parsed.data);
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  }

  const parsed = availabilityQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { slots: [], reason: "Parâmetros inválidos." },
      { status: 400 },
    );
  }

  const result = await getAvailableSlots(parsed.data);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
