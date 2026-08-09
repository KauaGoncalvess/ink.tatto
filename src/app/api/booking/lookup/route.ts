import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { clientIp, hit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";

/**
 * Reconhecimento de cliente recorrente no agendamento público.
 *
 * O visitante digita o telefone; se já existe cadastro, devolvemos apenas o
 * PRIMEIRO NOME e a informação de que há um e-mail salvo. Nunca o e-mail, o
 * nome completo ou o histórico.
 *
 * O motivo é direto: este endpoint é público e sem autenticação. Devolver
 * dados completos transformaria a busca por telefone num vazamento — bastaria
 * varrer números para montar uma base de clientes do estúdio. O primeiro nome
 * é o mínimo necessário para o "Que bom te ver de novo, Marina!" e não
 * identifica ninguém sozinho.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  // Limite apertado de propósito: é o que impede varredura de números.
  const limit = await hit(`lookup:${ip}`, 20, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { found: false },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const raw = (body as { phone?: unknown })?.phone;
  if (typeof raw !== "string") {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const phone = normalizePhone(raw);
  if (phone.length !== 10 && phone.length !== 11) {
    return NextResponse.json({ found: false });
  }

  const client = await prisma.client.findUnique({
    where: { phone },
    select: { name: true, email: true, isBlocked: true },
  });

  // Cliente bloqueado é tratado como inexistente: não damos pistas de que o
  // número está numa lista interna do estúdio.
  if (!client || client.isBlocked) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json(
    {
      found: true,
      firstName: client.name.trim().split(/\s+/)[0] ?? "",
      hasEmail: Boolean(client.email),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
