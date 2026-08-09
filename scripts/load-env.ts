import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega um arquivo `.env` para dentro de `process.env`.
 *
 * Existe porque dois contextos precisam disso e nenhum dos dois carrega o
 * `.env` sozinho: o Vitest (que só expõe variáveis `VITE_` em
 * `import.meta.env`) e o Prisma CLI, que **deixa de carregar o `.env`
 * automaticamente assim que existe um `prisma.config.ts`.
 *
 * Vinte linhas em vez de uma dependência: `dotenv` hoje só está na árvore como
 * transitiva do Prisma, e depender disso por acidente seria pior.
 *
 * Variáveis já definidas no ambiente têm precedência — em CI o `.env` costuma
 * nem existir e a configuração vem do runner.
 */

const ENV_LINE = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/i;

export function loadEnvFile(file = ".env"): void {
  let contents: string;
  try {
    contents = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const match = ENV_LINE.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}
