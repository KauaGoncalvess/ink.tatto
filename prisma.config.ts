import { defineConfig } from "prisma/config";

import { loadEnvFile } from "./scripts/load-env";

/**
 * Configuração do Prisma em arquivo próprio.
 *
 * Substitui o bloco `prisma` do package.json, que está deprecado e sai no
 * Prisma 7.
 *
 * A chamada a `loadEnvFile` não é opcional: a partir do momento em que este
 * arquivo existe, o Prisma CLI para de carregar o `.env` sozinho ("Prisma
 * config detected, skipping environment variable loading") e `DATABASE_URL`
 * sumiria de `migrate`, `seed` e `studio`.
 */
loadEnvFile();

export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
