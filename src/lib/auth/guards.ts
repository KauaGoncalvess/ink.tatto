import "server-only";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/auth/session";

/**
 * Guardas de autorização usadas em páginas e Server Actions do admin.
 *
 * O proxy já barra requisições sem cookie em /admin/*, mas ele NÃO é a
 * única linha de defesa: um Server Action pode ser invocado diretamente por
 * POST, então toda escrita revalida aqui — inclusive contra o banco, para que
 * um usuário desativado logo após receber o token perca o acesso na hora.
 */

export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para executar esta ação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Sessão válida ou redirect para o login. Use em páginas. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Sessão válida confirmada contra o banco. Use em toda Server Action que
 * escreve. Lança AuthorizationError em vez de redirecionar, para que a action
 * consiga devolver um erro tratável ao formulário.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthorizationError("Sessão expirada. Faça login novamente.");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) {
    throw new AuthorizationError("Sua conta não está mais ativa.");
  }

  // O papel vem do banco, não do token: uma mudança de permissão vale
  // imediatamente, sem esperar o token expirar.
  return { ...session, role: user.role };
}

/** Exige papel de administrador. */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthorizationError("Esta ação é restrita a administradores.");
  }
  return user;
}
