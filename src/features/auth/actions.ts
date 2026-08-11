"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth/session";
import { AuthorizationError, requireUser } from "@/lib/auth/guards";
import { clientIp, hit, RATE_LIMITS, reset } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { changePasswordSchema } from "@/schemas/account";

/**
 * Autenticação do painel administrativo.
 */

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
  destino: z.string().optional(),
});

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  /**
   * E-mail informado, devolvido para repopular o campo.
   *
   * O React 19 limpa os campos não controlados de um formulário depois que a
   * action roda. Sem isto, errar a senha apagaria também o e-mail e obrigaria
   * o usuário a digitar tudo de novo.
   */
  email?: string;
};

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = clientIp(await headers());
  const key = `login:${ip}`;

  const limit = await hit(key, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!limit.ok) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(limit.retryAfter / 60)} minutos.`,
      email: String(formData.get("email") ?? "").trim(),
    };
  }

  const submittedEmail = String(formData.get("email") ?? "").trim();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    destino: formData.get("destino"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return { error: "Confira os dados informados.", fieldErrors, email: submittedEmail };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  // Compara contra um hash falso quando o e-mail não existe: sem isso, a
  // resposta seria visivelmente mais rápida e permitiria enumerar contas.
  if (!user || !user.isActive) {
    await fakeVerify();
    return { error: "E-mail ou senha incorretos.", email: submittedEmail };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    // Mensagem genérica de propósito: não revela se o e-mail existe.
    return { error: "E-mail ou senha incorretos.", email: submittedEmail };
  }

  await reset(key);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  await createSessionCookie(session);

  await recordAudit({
    actor: session,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    summary: `Entrou no painel a partir de ${ip}.`,
  });

  // Só aceita destino interno — impede open redirect via ?destino=https://…
  const destination =
    parsed.data.destino && /^\/admin(\/|$)/.test(parsed.data.destino)
      ? parsed.data.destino
      : "/admin";

  redirect(destination);
}

export async function logout(): Promise<void> {
  await destroySessionCookie();
  redirect("/admin/login");
}

/**
 * Troca a senha do usuário da sessão.
 *
 * O alvo é sempre `actor.userId`, nunca um id vindo do cliente: assim não
 * existe nem a forma de pedir a troca da senha de outra pessoa. Exigir a senha
 * atual protege contra sessão esquecida aberta — sem isso, quem senta na
 * máquina troca a senha e toma a conta.
 */

export type ChangePasswordResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function changePassword(input: unknown): Promise<ChangePasswordResult> {
  let actor;
  try {
    actor = await requireUser();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const limit = await hit(
    `password-change:${actor.userId}`,
    RATE_LIMITS.passwordChange.limit,
    RATE_LIMITS.passwordChange.windowMs,
  );
  if (!limit.ok) {
    return {
      ok: false,
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(limit.retryAfter / 60)} minutos.`,
    };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "Confira os dados informados.", fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return { ok: false, error: "Sua conta não está mais ativa." };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return {
      ok: false,
      error: "Senha atual incorreta.",
      fieldErrors: { currentPassword: "Senha atual incorreta." },
    };
  }

  await prisma.user.update({
    where: { id: actor.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Acertou a senha atual: zera o contador para não punir quem só errou de
  // digitação nas tentativas anteriores.
  await reset(`password-change:${actor.userId}`);

  await recordAudit({
    actor,
    action: "UPDATE",
    entity: "User",
    entityId: actor.userId,
    summary: "Trocou a própria senha.",
  });

  // A sessão continua válida de propósito: o token não guarda a senha, e
  // deslogar depois de uma troca bem-sucedida só geraria a dúvida de se deu
  // certo. Sessões em outros aparelhos seguem abertas — encerrá-las exigiria
  // versionar o token, que é trabalho para quando houver "sair de todos os
  // dispositivos".
  return { ok: true, message: "Senha alterada." };
}
