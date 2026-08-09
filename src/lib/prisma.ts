import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma.
 *
 * Em desenvolvimento o hot reload do Next recria os módulos a cada alteração;
 * sem o cache no globalThis isso abriria uma nova pool de conexões por reload
 * até esgotar o limite do Postgres.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
