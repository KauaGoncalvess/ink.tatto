import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Proteção das rotas administrativas.
 *
 * Roda no edge, antes de qualquer render, e faz o corte barato: sem cookie
 * válido, redireciona para o login. NÃO é a única linha de defesa — cada
 * página e cada Server Action do admin revalida a sessão contra o banco
 * (src/lib/auth/guards.ts), porque uma Server Action pode ser chamada
 * diretamente por POST sem passar pela navegação.
 */

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Já autenticado no login: manda direto para o painel.
  if (pathname === "/admin/login") {
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserva o destino para retomar a navegação depois do login.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("destino", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Cobre /admin e tudo abaixo, exceto assets estáticos.
  matcher: ["/admin/:path*", "/admin"],
};
