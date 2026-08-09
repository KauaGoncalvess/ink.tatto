/**
 * Auditoria de acessibilidade com axe-core em navegador real.
 *
 * Roda o axe em todas as rotas públicas e do painel, em desktop e mobile, e
 * também nos estados que só existem depois de uma interação — modal da galeria,
 * cada passo do agendamento, diálogo de cadastro do admin. É justamente aí que
 * moram os problemas que uma varredura estática de JSX não enxerga: foco preso,
 * `aria-*` apontando para id inexistente, contraste calculado em runtime.
 *
 * O axe é injetado como init script (CDP), e não com <script>: a página roda
 * sob a CSP real, com nonce, e uma tag inline seria bloqueada — corretamente.
 *
 * Uso: node scripts/a11y.mjs [baseUrl] [outDir]
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? ".verification";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@inkhouse.studio";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "InkHouse@2026";

const LOCAL_CHROMIUM =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// WCAG 2.1 AA é o alvo declarado. `best-practice` entra junto porque pega
// problemas reais de navegação por leitor de tela (landmarks, ordem de
// cabeçalhos) que a norma não exige, mas que o usuário sente.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const results = [];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function newContext(width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // Sem isto o axe amostra cores no meio das transições de reveal e reporta
    // contrastes que nunca chegam à tela — a primeira rodada acusou um
    // vermelho "#d4384e" que é só o #ea3d55 a meio caminho do fade. O projeto
    // já responde a prefers-reduced-motion levando tudo ao estado final, que
    // é justamente o estado que interessa auditar (e de quebra valida esse
    // caminho do CSS).
    reducedMotion: "reduce",
  });
  await context.addInitScript({ path: AXE_PATH });
  return context;
}

/** Roda o axe na página no estado em que ela estiver e acumula o resultado. */
async function audit(page, label) {
  // O reveal só dispara quando o elemento entra na viewport; o que está
  // abaixo da dobra continuaria invisível para o axe. Marcar tudo como
  // revelado audita a página inteira de uma vez.
  await page.evaluate(() => {
    for (const node of document.querySelectorAll("[data-reveal]")) {
      node.setAttribute("data-revealed", "true");
    }
  });

  const outcome = await page.evaluate(
    async (tags) =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: tags },
        resultTypes: ["violations"],
      }),
    TAGS,
  );

  const violations = outcome.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 3).map((node) => ({
      target: node.target.join(" "),
      summary: node.failureSummary?.split("\n").slice(0, 3).join(" ").trim(),
    })),
    count: violation.nodes.length,
  }));

  results.push({ label, violations });

  const total = violations.reduce((sum, violation) => sum + violation.count, 0);
  if (violations.length === 0) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label} — ${violations.length} regra(s), ${total} elemento(s)`);
    for (const violation of violations) {
      console.log(`      [${violation.impact}] ${violation.id}: ${violation.help}`);
      for (const node of violation.nodes) {
        console.log(`         ${node.target}`);
        if (node.summary) console.log(`         ↳ ${node.summary}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log("\n1. Rotas públicas @1440px");
// ---------------------------------------------------------------------------

const publicRoutes = [
  "/",
  "/sobre",
  "/artistas",
  "/servicos",
  "/galeria",
  "/contato",
  "/agendamento",
  "/rota-que-nao-existe",
];

const desktop = await newContext(1440);
const desktopPage = await desktop.newPage();

for (const route of publicRoutes) {
  await desktopPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await desktopPage.waitForTimeout(500);
  await audit(desktopPage, `${route} @1440`);
}

// Detalhe de artista (rota dinâmica).
await desktopPage.goto(`${BASE}/artistas`, { waitUntil: "domcontentloaded" });
await desktopPage.locator('a[href^="/artistas/"]').first().click();
await desktopPage.waitForFunction(() =>
  /\/artistas\/[a-z0-9-]+$/.test(window.location.pathname),
);
await desktopPage.waitForTimeout(500);
await audit(desktopPage, "/artistas/[slug] @1440");

// ---------------------------------------------------------------------------
console.log("\n2. Estados interativos");
// ---------------------------------------------------------------------------

// Lightbox da galeria: é um diálogo modal, o caso clássico de foco preso.
await desktopPage.goto(`${BASE}/galeria`, { waitUntil: "domcontentloaded" });
await desktopPage.locator('button[aria-label^="Ampliar"]').first().click();
await desktopPage.waitForSelector('[role="dialog"]');
await audit(desktopPage, "galeria com lightbox aberto");
await desktopPage.keyboard.press("Escape");

// Menu mobile aberto.
const mobile = await newContext(390);
const mobilePage = await mobile.newPage();
await mobilePage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await mobilePage.getByRole("button", { name: /menu/i }).first().click();
await mobilePage.waitForTimeout(400);
await audit(mobilePage, "home com menu mobile aberto @390");

for (const route of ["/", "/agendamento", "/galeria"]) {
  await mobilePage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(500);
  await audit(mobilePage, `${route} @390`);
}

// Passos do wizard: cada um troca o conteúdo inteiro da região.
await desktopPage.goto(`${BASE}/agendamento`, { waitUntil: "domcontentloaded" });
await desktopPage.getByRole("button", { name: /Fine line/i }).first().click();
await desktopPage.waitForURL(/servico=/);
await desktopPage.waitForSelector("text=Escolha o artista");
await audit(desktopPage, "agendamento passo 2 (artista)");

await desktopPage.locator("button").filter({ hasText: "Juliana Reis" }).first().click();
await desktopPage.waitForURL(/artista=/);
await desktopPage.waitForSelector('button[role="gridcell"]');
await desktopPage.waitForTimeout(1500);
await audit(desktopPage, "agendamento passo 3 (calendário)");

// ---------------------------------------------------------------------------
console.log("\n3. Painel administrativo");
// ---------------------------------------------------------------------------

const admin = await newContext(1440);
const adminPage = await admin.newPage();

await adminPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await audit(adminPage, "/admin/login @1440");

await adminPage.fill("#email", ADMIN_EMAIL);
await adminPage.fill("#password", ADMIN_PASSWORD);
await adminPage.getByRole("button", { name: /^Entrar$/ }).click();

let loggedIn = true;
try {
  await adminPage.waitForFunction(() => window.location.pathname === "/admin", {
    timeout: 20000,
  });
} catch {
  loggedIn = false;
  console.log("  ⚠ login falhou (rate limit?) — rotas do admin não auditadas");
}

if (loggedIn) {
  const adminRoutes = [
    "/admin",
    "/admin/agendamentos",
    "/admin/calendario",
    "/admin/calendario?visao=semana",
    "/admin/clientes",
    "/admin/artistas",
    "/admin/servicos",
    "/admin/horarios",
    "/admin/galeria",
    "/admin/depoimentos",
    "/admin/notificacoes",
    "/admin/configuracoes",
  ];

  for (const route of adminRoutes) {
    await adminPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await adminPage.waitForTimeout(600);
    await audit(adminPage, `${route} @1440`);
  }

  // Diálogo de CRUD: formulário dentro de modal, com foco e rótulos próprios.
  await adminPage.goto(`${BASE}/admin/servicos`, { waitUntil: "domcontentloaded" });
  await adminPage.getByRole("button", { name: /Novo serviço/i }).first().click();
  await adminPage.waitForSelector('[role="dialog"]');
  await adminPage.waitForTimeout(400);
  await audit(adminPage, "admin/servicos com diálogo aberto");
  await adminPage.keyboard.press("Escape");

  // Painel em telas estreitas: a sidebar vira sheet.
  const adminMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
    reducedMotion: "reduce",
    storageState: await admin.storageState(),
  });
  await adminMobile.addInitScript({ path: AXE_PATH });
  const adminMobilePage = await adminMobile.newPage();
  await adminMobilePage.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await adminMobilePage.waitForTimeout(600);
  await audit(adminMobilePage, "/admin @390");
  await adminMobile.close();
}

await browser.close();

// ---------------------------------------------------------------------------

await writeFile(join(OUT, "a11y.json"), JSON.stringify(results, null, 2));

const offenders = results.filter((entry) => entry.violations.length > 0);
const byRule = new Map();
for (const entry of offenders) {
  for (const violation of entry.violations) {
    const current = byRule.get(violation.id) ?? { impact: violation.impact, pages: 0 };
    current.pages += 1;
    byRule.set(violation.id, current);
  }
}

console.log("\n─────────────────────────────────────────────");
console.log(`${results.length} estado(s) auditado(s), ${offenders.length} com violação.`);

if (byRule.size > 0) {
  console.log("\nRegras violadas (ordenadas por alcance):");
  for (const [id, info] of [...byRule].sort((a, b) => b[1].pages - a[1].pages)) {
    console.log(`  ${id} [${info.impact}] — ${info.pages} estado(s)`);
  }
  process.exit(1);
}

console.log("Nenhuma violação de WCAG 2.1 AA encontrada.");
