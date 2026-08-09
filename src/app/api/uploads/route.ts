import { NextResponse } from "next/server";

import { clientIp, hit, RATE_LIMITS } from "@/lib/rate-limit";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, sniffImageType, storage } from "@/lib/storage";

/**
 * Upload da imagem de referência do agendamento.
 *
 * Endpoint público (o agendamento é para visitante não autenticado), então a
 * validação é estrita: rate limit por IP, tamanho máximo, mime declarado E
 * assinatura binária conferida antes de tocar o disco.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = hit(`upload:${ip}`, RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitos envios seguidos. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // Rejeita cedo pelo header, antes de bufferizar o corpo inteiro na memória.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES * 1.1) {
    return NextResponse.json(
      { error: "A imagem excede o limite de 5 MB." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "A imagem excede o limite de 5 MB." },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return NextResponse.json(
      { error: "Formato não suportado. Envie JPG, PNG ou WEBP." },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // O tipo declarado no multipart é escolhido pelo cliente; a assinatura
  // binária é o que realmente decide.
  const detected = sniffImageType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "O arquivo enviado não é uma imagem válida." },
      { status: 415 },
    );
  }

  try {
    const stored = await storage.save(file, buffer);
    return NextResponse.json({ path: stored.path });
  } catch (error) {
    console.error("[uploads] falha ao gravar arquivo", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a imagem. Tente novamente." },
      { status: 500 },
    );
  }
}
