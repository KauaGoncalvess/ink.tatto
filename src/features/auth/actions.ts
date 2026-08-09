"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth/session";
import { clientIp, hit, RATE_LIMITS, reset } from "@/lib/rate-limit";

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

  const limit = hit(key, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
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

  reset(key);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
