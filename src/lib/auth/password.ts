import bcrypt from "bcryptjs";

/**
 * Hash de senha.
 *
 * bcryptjs (implementação em JS puro) em vez do binding nativo: o projeto
 * precisa rodar sem toolchain de compilação em qualquer ambiente de deploy.
 * Custo 12 é o equilíbrio atual entre resistência a força bruta e latência
 * aceitável no login (~250ms).
 */

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Comparação falsa usada quando o email não existe.
 *
 * Sem isso, o login responderia visivelmente mais rápido para emails
 * inexistentes, permitindo enumerar contas válidas pelo tempo de resposta.
 */
const DUMMY_HASH = "$2a$12$c3VwZXJzZWNyZXRkdW1teQOu6bFqUZlnGgYQBk6.KAqTOgtGB9NAe";

export async function fakeVerify(): Promise<void> {
  await bcrypt.compare("senha-inexistente", DUMMY_HASH);
}
