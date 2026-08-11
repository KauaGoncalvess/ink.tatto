import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { SessionPayload } from "@/lib/auth/session";

/**
 * Autorização das Server Actions — contra o banco de verdade.
 *
 * Uma Server Action é um endpoint POST público: o proxy que protege
 * `/admin/*` não participa da invocação direta. Quem garante a permissão é a
 * guarda no topo de cada action, e é exatamente isso que estes testes provam —
 * não por inspeção do código, mas chamando as actions com sessões forjadas.
 *
 * O teste toca o Postgres local porque a decisão de autorização depende do
 * banco: `requireUser` relê o papel e o `isActive` do usuário a cada escrita,
 * de propósito. Mockar o Prisma aqui testaria o mock, não a regra.
 *
 * Sem `DATABASE_URL` alcançável a suíte é pulada com aviso, para que
 * `npm run test` continue rodando o resto em máquinas sem banco.
 */

// A sessão "atual" destes testes. `vi.hoisted` porque a fábrica do `vi.mock`
// é içada acima dos imports.
const auth = vi.hoisted(() => ({
  session: null as SessionPayload | null,
}));

vi.mock("server-only", () => ({}));

// `revalidatePath` exige contexto de requisição do Next; aqui só precisa não
// explodir. O que importa é o efeito no banco, verificado adiante.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Substitui a leitura do cookie: o resto da cadeia de autorização
// (`requireUser` → banco → `requireAdmin`) continua real.
vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "ink_session",
  getSession: async () => auth.session,
}));

const { prisma } = await import("@/lib/prisma");
const { deleteClient, saveClient, saveService } =
  await import("@/features/admin/actions");
const { saveOpeningHours } = await import("@/features/admin/hours-actions");
const { updateAppointmentStatus } =
  await import("@/features/appointments/actions");
const { changePassword } = await import("@/features/auth/actions");
const { hashPassword, verifyPassword } = await import("@/lib/auth/password");

const STAMP = Date.now();
const TAG = `authztest-${STAMP}`;
// Telefone derivado do carimbo de tempo: `Client.phone` é único e o banco
// costuma estar populado pelo seed.
const PHONE = `11${String(STAMP).slice(-9)}`;

// Avaliado na carga do módulo — `describe.skipIf` é resolvido na coleta, antes
// de qualquer hook rodar.
const reachable = await prisma.$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

if (!reachable) {
  console.warn(
    "[authz] Postgres inacessível — testes de autorização pulados. " +
      "Suba o banco e rode de novo para exercitá-los.",
  );
}

const users: Record<"admin" | "artist" | "inactive", SessionPayload> = {
  admin: {} as SessionPayload,
  artist: {} as SessionPayload,
  inactive: {} as SessionPayload,
};

/** Senha real dos usuários de teste — usada pelos casos de troca de senha. */
const CURRENT_PASSWORD = "senha-atual-do-teste";

async function createUser(
  kind: "admin" | "artist" | "inactive",
): Promise<SessionPayload> {
  const role = kind === "artist" ? "ARTIST" : "ADMIN";
  const user = await prisma.user.create({
    data: {
      email: `${TAG}-${kind}@teste.local`,
      name: `Teste ${kind}`,
      passwordHash: await hashPassword(CURRENT_PASSWORD),
      role,
      isActive: kind !== "inactive",
    },
  });
  return { userId: user.id, email: user.email, name: user.name, role };
}

const serviceInput = (name: string) => ({
  name,
  shortDescription: "Serviço criado por teste automatizado.",
  description:
    "Descrição suficientemente longa para passar na validação do Zod.",
  durationMin: 60,
  priceFrom: 300,
});

const clientInput = (name: string) => ({ name, phone: PHONE });

function countServices(name: string) {
  return prisma.service.count({ where: { name } });
}

describe.skipIf(!reachable)("autorização das Server Actions", () => {
  beforeAll(async () => {
    users.admin = await createUser("admin");
    users.artist = await createUser("artist");
    users.inactive = await createUser("inactive");
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        userName: { startsWith: `Teste ` },
        entity: { in: ["Service", "Client"] },
      },
    });
    await prisma.service.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TAG } } });
    await prisma.$disconnect();
  });

  it("recusa escrita sem sessão", async () => {
    auth.session = null;
    const name = `${TAG} sem sessao`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Sessão expirada/i);
    await expect(countServices(name)).resolves.toBe(0);
  });

  it("recusa ação de admin para um usuário ARTIST", async () => {
    auth.session = users.artist;
    const name = `${TAG} artista tentando`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(
      /restrita a administradores/i,
    );
    await expect(countServices(name)).resolves.toBe(0);
  });

  it("permite a mesma ação para um usuário ADMIN", async () => {
    auth.session = users.admin;
    const name = `${TAG} admin criando`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(true);
    await expect(countServices(name)).resolves.toBe(1);
  });

  it("ignora o papel do token e usa o do banco (impede escalonamento)", async () => {
    // Cenário: o artista foi promovido a admin e depois rebaixado, mas ainda
    // carrega um token antigo dizendo ADMIN. Ou o secret vazou e alguém
    // assinou um token com o papel que quis. Em ambos os casos o papel
    // efetivo tem de vir do banco.
    auth.session = { ...users.artist, role: "ADMIN" };
    const name = `${TAG} token mentiroso`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(
      /restrita a administradores/i,
    );
    await expect(countServices(name)).resolves.toBe(0);
  });

  it("recusa usuário desativado mesmo com token válido", async () => {
    auth.session = users.inactive;
    const name = `${TAG} desativado`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/não está mais ativa/i);
    await expect(countServices(name)).resolves.toBe(0);
  });

  it("recusa sessão de usuário que não existe mais", async () => {
    auth.session = { ...users.admin, userId: "usr_removido_do_banco" };
    const name = `${TAG} usuario fantasma`;

    const result = await saveService(serviceInput(name));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/não está mais ativa/i);
    await expect(countServices(name)).resolves.toBe(0);
  });

  it("autoriza antes de validar o payload", async () => {
    // Sem sessão e com dados inválidos, a resposta tem de ser a de permissão.
    // Se viesse o erro de validação, a action estaria processando entrada de
    // quem não deveria nem ser ouvido.
    auth.session = null;

    const result = await saveService({ name: "x" });

    expect(result.ok === false && result.error).toMatch(/Sessão expirada/i);
    expect(result.ok === false && result.fieldErrors).toBeUndefined();
  });

  it("separa guarda de operador e de administrador", async () => {
    // Um ARTIST atende clientes: pode cadastrá-los. Excluir cadastro é
    // destrutivo e continua restrito ao admin.
    auth.session = users.artist;
    const name = `${TAG} cliente do artista`;

    const created = await saveClient(clientInput(name));
    expect(created.ok).toBe(true);

    const removed = await deleteClient(
      created.ok ? (created.id as string) : "",
    );
    expect(removed.ok).toBe(false);
    expect(removed.ok === false && removed.error).toMatch(
      /restrita a administradores/i,
    );

    await expect(prisma.client.count({ where: { name } })).resolves.toBe(1);
  });

  it("protege o horário de funcionamento do estúdio", async () => {
    auth.session = users.artist;

    const result = await saveOpeningHours(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        isOpen: true,
        openTime: "00:00",
        closeTime: "23:30",
      })),
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(
      /restrita a administradores/i,
    );
  });

  it("protege a mudança de status de agendamento", async () => {
    auth.session = null;

    const result = await updateAppointmentStatus("qualquer-id", "CANCELLED");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Sessão expirada/i);
  });

  // -------------------------------------------------------------------------
  // Troca de senha
  // -------------------------------------------------------------------------

  it("não troca senha sem sessão", async () => {
    auth.session = null;

    const result = await changePassword({
      currentPassword: CURRENT_PASSWORD,
      newPassword: "uma-senha-nova-longa",
      confirmPassword: "uma-senha-nova-longa",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Sessão expirada/i);
  });

  it("não troca senha com a senha atual errada", async () => {
    auth.session = users.artist;

    const result = await changePassword({
      currentPassword: "chute-errado",
      newPassword: "uma-senha-nova-longa",
      confirmPassword: "uma-senha-nova-longa",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.fieldErrors?.currentPassword).toMatch(
      /incorreta/i,
    );

    // O hash não pode ter mudado.
    const user = await prisma.user.findUnique({
      where: { id: users.artist.userId },
      select: { passwordHash: true },
    });
    await expect(
      verifyPassword(CURRENT_PASSWORD, user!.passwordHash),
    ).resolves.toBe(true);
  });

  it("recusa nova senha curta demais", async () => {
    auth.session = users.artist;

    const result = await changePassword({
      currentPassword: CURRENT_PASSWORD,
      newPassword: "curta",
      confirmPassword: "curta",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.fieldErrors?.newPassword).toMatch(
      /12 caracteres/,
    );
  });

  it("só altera o usuário da sessão, ignorando id vindo do cliente", async () => {
    // O cenário que a action tem de tornar impossível: um artista mandando o
    // id do administrador junto do payload para trocar a senha dele.
    auth.session = users.artist;

    const result = await changePassword({
      userId: users.admin.userId,
      id: users.admin.userId,
      currentPassword: CURRENT_PASSWORD,
      newPassword: "senha-nova-do-artista",
      confirmPassword: "senha-nova-do-artista",
    });

    expect(result.ok).toBe(true);

    const [artist, admin] = await Promise.all([
      prisma.user.findUnique({
        where: { id: users.artist.userId },
        select: { passwordHash: true },
      }),
      prisma.user.findUnique({
        where: { id: users.admin.userId },
        select: { passwordHash: true },
      }),
    ]);

    // A do artista mudou…
    await expect(
      verifyPassword("senha-nova-do-artista", artist!.passwordHash),
    ).resolves.toBe(true);
    // …e a do administrador continua intacta.
    await expect(
      verifyPassword(CURRENT_PASSWORD, admin!.passwordHash),
    ).resolves.toBe(true);
  });

  it("registra na auditoria quem de fato executou", async () => {
    auth.session = users.admin;
    const name = `${TAG} auditado`;

    const result = await saveService(serviceInput(name));
    expect(result.ok).toBe(true);

    const entry = await prisma.auditLog.findFirst({
      where: { entity: "Service", entityId: result.ok ? result.id : undefined },
    });

    expect(entry?.userId).toBe(users.admin.userId);
    expect(entry?.action).toBe("CREATE");
  });
});
