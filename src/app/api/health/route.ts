import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Healthcheck para monitoramento externo.
 *
 * Verifica o que realmente derruba a aplicação: a conexão com o banco. Um
 * endpoint que só devolve `{ ok: true }` sem tocar em nada responde 200 com o
 * Postgres fora do ar — ou seja, mente exatamente na hora em que você precisa
 * dele.
 *
 * Não expõe versão, host, nome de banco nem contagem de registros: é público
 * e sem autenticação, então diz apenas se está de pé.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
