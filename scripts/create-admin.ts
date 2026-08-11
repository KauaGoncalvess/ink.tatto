/**
 * Cria — ou redefine a senha de — um administrador do painel.
 *
 * Existe porque não havia caminho para subir produção limpa. As duas opções
 * eram rodar o seed, que apaga todas as tabelas e insere vinte clientes e
 * trinta agendamentos fictícios, ou ficar sem nenhum login. Este script toca
 * exatamente uma linha da tabela `User` e mais nada.
 *
 * É idempotente de propósito: rodar de novo com outra senha é o modo
 * "esqueci a senha" — o único que existe enquanto ninguém consegue entrar no
 * painel para usar a tela de troca.
 *
 * Uso:
 *   ADMIN_EMAIL=voce@estudio.com.br ADMIN_PASSWORD='...' npm run admin:create
 *
 * A senha nunca é impressa, nem em caso de erro: a saída deste comando
 * costuma ir para o log da plataforma de deploy.
 */

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const MIN_PASSWORD_LENGTH = 12;

const USAGE = `
Uso:
  ADMIN_EMAIL=voce@estudio.com.br ADMIN_PASSWORD='sua-senha-longa' npm run admin:create

Variáveis:
  ADMIN_EMAIL     obrigatória
  ADMIN_PASSWORD  obrigatória, mínimo de ${MIN_PASSWORD_LENGTH} caracteres
  ADMIN_NAME      opcional (padrão: "Administração")
`.trim();

function fail(message: string): never {
  console.error(`\n✗ ${message}\n\n${USAGE}\n`);
  process.exit(1);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administração";

  if (!email) fail("ADMIN_EMAIL não foi definida.");
  if (!password) fail("ADMIN_PASSWORD não foi definida.");

  // Validação simples e suficiente: o formato de e-mail já é conferido no
  // login, e o que importa aqui é não gravar lixo por engano de digitação.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`ADMIN_EMAIL não parece um e-mail: ${email}`);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(
      `ADMIN_PASSWORD tem ${password.length} caracteres; o mínimo é ${MIN_PASSWORD_LENGTH}.`,
    );
  }

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL não foi definida — não há banco para gravar.");
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true },
    });

    const passwordHash = await hashPassword(password);

    if (existing) {
      await prisma.user.update({
        where: { email },
        // Reativa e promove: se a conta foi desativada ou rebaixada, este
        // comando é a saída de emergência para recuperar o acesso.
        data: { passwordHash, name, role: "ADMIN", isActive: true },
      });

      console.log(`\n✔ Senha redefinida para ${email}.`);
      if (existing.role !== "ADMIN") {
        console.log(`  Papel alterado de ${existing.role} para ADMIN.`);
      }
      if (!existing.isActive) {
        console.log("  Conta reativada.");
      }
    } else {
      await prisma.user.create({
        data: { email, name, passwordHash, role: "ADMIN" },
      });
      console.log(`\n✔ Administrador criado: ${email}`);
    }

    console.log("  Entre em /admin/login e troque a senha em /admin/conta.\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // A mensagem do Prisma pode conter a URL do banco; o stack, não.
  console.error("\n✗ Falha ao gravar o administrador.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
