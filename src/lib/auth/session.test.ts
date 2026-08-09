import { SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";

// `session.ts` é módulo de servidor: importa `server-only` (que lança fora do
// bundle React Server) e `next/headers` (que exige contexto de requisição).
// Aqui exercitamos apenas assinatura/verificação do token, então os dois viram
// stubs — o que continua sendo testado é a criptografia, não o cookie.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => {
    throw new Error("cookies() não deve ser chamado nestes testes");
  },
}));

const SECRET = "secret-de-teste-com-mais-de-32-caracteres-para-passar";
const OTHER_SECRET = "outro-secret-igualmente-longo-para-o-teste-de-forja";

const { signSession, verifySession } = await import("@/lib/auth/session");

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
  process.env.AUTH_SESSION_HOURS = "12";
});

/**
 * O token de sessão é a única credencial do painel. Um bug aqui não aparece em
 * teste de fluxo: o admin loga, tudo funciona, e ninguém percebe que a
 * verificação também aceita tokens forjados. Por isso os casos abaixo são de
 * rejeição — o caminho feliz é o menos interessante.
 */
describe("token de sessão", () => {
  const payload = {
    userId: "usr_1",
    email: "admin@estudio.test",
    name: "Admin",
    role: "ADMIN" as const,
  };

  it("faz round-trip de um token legítimo", async () => {
    const token = await signSession(payload);
    await expect(verifySession(token)).resolves.toEqual(payload);
  });

  it("rejeita token assinado com outro secret", async () => {
    const forged = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(OTHER_SECRET));

    await expect(verifySession(forged)).resolves.toBeNull();
  });

  it("rejeita token cuja assinatura foi adulterada", async () => {
    const token = await signSession(payload);
    const [header, body, signature] = token.split(".");
    // Inverte um caractere do corpo mantendo o formato: a assinatura deixa de
    // bater e a verificação tem de recusar.
    const tampered = `${header}.${body.slice(0, -2)}${body.slice(-2) === "AA" ? "AB" : "AA"}.${signature}`;

    await expect(verifySession(tampered)).resolves.toBeNull();
  });

  it("rejeita token expirado", async () => {
    const expired = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.userId)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(expired)).resolves.toBeNull();
  });

  it("rejeita token com algoritmo 'none'", async () => {
    // Ataque clássico: o atacante troca o alg do header e remove a assinatura.
    // `jwtVerify` é chamado com `algorithms: ["HS256"]` justamente para isso.
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "none", typ: "JWT" })}.${encode({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`;

    await expect(verifySession(unsigned)).resolves.toBeNull();
  });

  it("rejeita token válido cujo payload não tem os campos esperados", async () => {
    const semRole = await new SignJWT({
      userId: "usr_1",
      email: "a@b.test",
      name: "A",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(semRole)).resolves.toBeNull();
  });

  it("rejeita papel inexistente mesmo com assinatura válida", async () => {
    // Cenário real: alguém com o secret vazado tentando escalar para um papel
    // que o sistema não conhece. A verificação é allowlist, não denylist.
    const superuser = await new SignJWT({ ...payload, role: "SUPERUSER" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifySession(superuser)).resolves.toBeNull();
  });

  it("rejeita lixo", async () => {
    await expect(verifySession("")).resolves.toBeNull();
    await expect(verifySession("não-é-um-jwt")).resolves.toBeNull();
    await expect(verifySession("a.b.c")).resolves.toBeNull();
  });

  it("recusa assinar quando AUTH_SECRET é curto demais", async () => {
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "curto";
    try {
      await expect(signSession(payload)).rejects.toThrow(/AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });
});
