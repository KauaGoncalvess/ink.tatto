import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import type { UserRole } from "@prisma/client";

/**
 * Sessão do painel administrativo.
 *
 * JWT HS256 assinado com AUTH_SECRET, guardado num cookie httpOnly. O formato
 * foi escolhido para poder ser verificado no proxy (que roda antes do render), onde
 * não há acesso ao banco — o proxy faz o corte barato e cada Server
 * Action revalida de novo contra o banco antes de qualquer escrita.
 */

export const SESSION_COOKIE = "ink_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET ausente ou curto demais. Gere um valor com `openssl rand -base64 48` e defina no .env.",
    );
  }
  return new TextEncoder().encode(secret);
}

function sessionDurationSeconds(): number {
  const hours = Number(process.env.AUTH_SESSION_HOURS ?? 12);
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const maxAge = sessionDurationSeconds();
  return new SignJWT({ ...payload } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());
}

/** Verifica e decodifica. Retorna null para qualquer token inválido ou expirado. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "ARTIST")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/** Grava o cookie de sessão. Chamado apenas de Server Actions / Route Handlers. */
export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds(),
  });
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Sessão atual a partir do cookie, ou null. Não faz redirect. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
