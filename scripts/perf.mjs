/**
 * Medição de peso por rota, com navegador real e cache frio.
 *
 * Soma o que trafega de fato (corpo comprimido, como chega ao usuário), em vez
 * de olhar o tamanho dos arquivos em disco. Cada rota roda num contexto novo
 * para nenhuma reaproveitar o cache da anterior — é o número da primeira
 * visita, que é o que decide se a página abre rápido no 4G.
 *
 * Também lista os maiores chunks de JS por rota: é assim que se descobre que
 * uma biblioteca de gráfico está sendo baixada numa página que não tem
 * gráfico nenhum.
 *
 * Uso: node scripts/perf.mjs [baseUrl] [outDir]
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? ".verification";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@inkhouse.studio";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "InkHouse@2026";

const LOCAL_CHROMIUM =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

/** Carrega uma rota em contexto limpo e devolve o peso por tipo. */
async function measure(route, { storageState } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    ...(storageState ? { storageState } : {}),
  });
  const page = await context.newPage();

  const totals = { document: 0, script: 0, stylesheet: 0, image: 0, font: 0, other: 0 };
  const gzipped = { ...totals };
  const scripts = [];

  // O `next start` local serve `_next/static` sem compressão — em produção
  // isso fica a cargo do CDN/proxy. Medimos os dois: o cru, que é o custo de
  // parse e execução no aparelho, e o comprimido, que é o que trafega.
  page.on("response", async (response) => {
    const request = response.request();
    const type = request.resourceType();
    const bucket = type in totals ? type : "other";

    let body = null;
    try {
      body = await response.body();
    } catch {
      // Resposta já descartada (redirect, preflight): não conta.
    }
    if (!body) return;

    totals[bucket] += body.byteLength;
    gzipped[bucket] += gzipSync(body).byteLength;

    if (type === "script") {
      scripts.push({ url: new URL(request.url()).pathname, size: body.byteLength });
    }
  });

  await page.goto(`${BASE}${route}`, { waitUntil: "load" });
  // Chunks carregados logo após a hidratação também contam para a rota.
  await page.waitForTimeout(1500);

  await context.close();

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const totalGzip = Object.values(gzipped).reduce((sum, value) => sum + value, 0);
  scripts.sort((a, b) => b.size - a.size);

  return { route, totals, gzipped, total, totalGzip, scripts: scripts.slice(0, 5) };
}

const publicRoutes = ["/", "/servicos", "/artistas", "/galeria", "/contato", "/agendamento"];

console.log("\nRotas públicas (cache frio)\n");
console.log(
  "rota".padEnd(16) +
    "JS".padStart(10) +
    "JS gzip".padStart(11) +
    "CSS gzip".padStart(11) +
    "total".padStart(11) +
    "total gzip".padStart(13),
);
console.log("─".repeat(72));

const report = [];

for (const route of publicRoutes) {
  const result = await measure(route);
  report.push(result);
  console.log(
    result.route.padEnd(16) +
      kb(result.totals.script).padStart(10) +
      kb(result.gzipped.script).padStart(11) +
      kb(result.gzipped.stylesheet).padStart(11) +
      kb(result.total).padStart(11) +
      kb(result.totalGzip).padStart(13),
  );
}

// Painel: precisa de sessão.
const auth = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const authPage = await auth.newPage();
await authPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await authPage.fill("#email", ADMIN_EMAIL);
await authPage.fill("#password", ADMIN_PASSWORD);
await authPage.getByRole("button", { name: /^Entrar$/ }).click();

let session = null;
try {
  await authPage.waitForFunction(() => window.location.pathname === "/admin", {
    timeout: 20000,
  });
  session = await auth.storageState();
} catch {
  console.log("\n⚠ login falhou — rotas do painel não medidas");
}
await auth.close();

if (session) {
  console.log("\nPainel administrativo (cache frio, autenticado)\n");
  console.log(
    "rota".padEnd(22) +
      "JS".padStart(10) +
      "JS gzip".padStart(11) +
      "total".padStart(11) +
      "total gzip".padStart(13),
  );
  console.log("─".repeat(67));

  for (const route of ["/admin", "/admin/agendamentos", "/admin/calendario"]) {
    const result = await measure(route, { storageState: session });
    report.push(result);
    console.log(
      result.route.padEnd(22) +
        kb(result.totals.script).padStart(10) +
        kb(result.gzipped.script).padStart(11) +
        kb(result.total).padStart(11) +
        kb(result.totalGzip).padStart(13),
    );
  }
}

await browser.close();

console.log("\nMaiores chunks de JS por rota\n");
for (const result of report) {
  console.log(`  ${result.route}`);
  for (const script of result.scripts) {
    console.log(`     ${kb(script.size).padStart(10)}  ${script.url}`);
  }
}

await writeFile(join(OUT, "perf.json"), JSON.stringify(report, null, 2));
console.log(`\nRelatório salvo em ${join(OUT, "perf.json")}`);
