import { loadEnvFile } from "./scripts/load-env";

/**
 * O Vitest só expõe variáveis prefixadas com `VITE_` em `import.meta.env`, e o
 * Prisma lê `DATABASE_URL` de `process.env`. Sem isto os testes que tocam o
 * banco não conseguiriam conectar.
 */
loadEnvFile();
