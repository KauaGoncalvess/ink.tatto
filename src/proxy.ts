import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Proxy: CSP com nonce + proteção das rotas administrativas.
 *
 * O arquivo se chama `proxy.ts` porque o Next 16 aposentou a convenção
 * `middleware` — mesma execução antes do render, nome novo.
 *
 * CSP
 * ---
 * Uma política real exige um nonce novo por requisição, e o nonce só pode ser
 * gerado aqui — é o único ponto que roda antes do render e consegue casar o
 * cabeçalho com o HTML. O Next lê o nonce do próprio header CSP e o aplica
 * automaticamente aos seus scripts inline.
 *
 * `strict-dynamic` deixa os scripts carregados por um script confiável
 * herdarem a confiança, que é como os chunks do Next funcionam. Em
 * desenvolvimento `'unsafe-eval'` é necessário para o React Refresh; em
 * produção ele sai.
 *
 * Autorização
 * -----------
 * O corte barato de quem não tem cookie. NÃO é a única linha de defesa: cada
 * página e cada Server Action revalida a sessão contra o banco, porque uma
 * action pode ser chamada por POST direto sem passar por aqui.
 */

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // strict-dynamic + nonce: os chunks do Next herdam a confiança do script
    // inicial. 'unsafe-eval' só em dev, para o React Refresh funcionar.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
    // O Next injeta <style> inline no App Router; não há nonce para eles, e
    // 'unsafe-inline' em estilo não permite execução de código.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // O mapa da página de contato vem do OpenStreetMap.
    `frame-src 'self' https://www.openstreetmap.org`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .filter(Boolean)
    .join("; ");
}

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";

  // 16 bytes em base64 — entropia suficiente e sem dependência de Node.
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );
  const csp = buildCsp(nonce, isDev);

  const { pathname, search } = request.nextUrl;

  /** Aplica o nonce e a CSP à resposta e à requisição encaminhada. */
  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // O Next lê o nonce daqui para aplicar nos próprios scripts inline.
  requestHeaders.set("Content-Security-Policy", csp);

  const proceed = () =>
    withCsp(NextResponse.next({ request: { headers: requestHeaders } }));

  // Rotas fora do admin: só a CSP.
  if (!pathname.startsWith("/admin")) return proceed();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname === "/admin/login") {
    if (session) {
      return withCsp(NextResponse.redirect(new URL("/admin", request.url)));
    }
    return proceed();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserva o destino para retomar a navegação depois do login.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("destino", `${pathname}${search}`);
    }
    return withCsp(NextResponse.redirect(loginUrl));
  }

  return proceed();
}

export const config = {
  /**
   * Roda em tudo, menos assets estáticos e imagens otimizadas — eles não
   * executam script e passar por aqui só adicionaria latência.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|uploads/|robots.txt|sitemap.xml).*)",
  ],
};
