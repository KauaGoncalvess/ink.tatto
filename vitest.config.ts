import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolução nativa dos paths do tsconfig (@/* -> src/*).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Fuso deliberadamente diferente do estúdio: garante que a lógica de
    // agenda não dependa do relógio do processo.
    env: { TZ: "UTC" },
  },
});
