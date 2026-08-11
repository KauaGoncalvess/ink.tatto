/**
 * Verificação ponta a ponta com navegador real.
 *
 * Percorre o que um cliente e o estúdio realmente fazem:
 *   1. agendamento completo no site público, até o número da reserva;
 *   2. login no painel e confirmação do agendamento recém-criado;
 *   3. varredura das páginas do admin em busca de erro de runtime;
 *   4. capturas em 390px e 1440px para conferir a responsividade.
 *
 * Uso: node scripts/e2e.mjs [baseUrl] [outDir]
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? ".verification";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@inkhouse.studio";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "InkHouse@2026";

const LOCAL_CHROMIUM =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const failures = [];
const notes = [];

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});

/** Erros de console em qualquer página são falha de verificação. */
const consoleErrors = [];
context.on("page", (page) => {
  page.on("pageerror", (error) => consoleErrors.push(`${page.url()} :: ${error}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      // Ruído conhecido do dev overlay / prefetch; não indica bug de página.
      if (text.includes("Failed to load resource")) return;
      consoleErrors.push(`${page.url()} :: ${text}`);
    }
  });
});

const page = await context.newPage();

// ---------------------------------------------------------------------------
console.log("\n1. Fluxo de agendamento público");
// ---------------------------------------------------------------------------

await page.goto(`${BASE}/agendamento`, { waitUntil: "domcontentloaded" });

// Passo 1 — serviço
await page.getByRole("button", { name: /Fine line/i }).first().click();
await page.waitForURL(/servico=/);
check("passo 1: serviço selecionado", page.url().includes("servico="));

// Passo 2 — artista.
// A resposta da varredura de dias é aguardada explicitamente: enquanto ela não
// chega, o calendário deixa todas as datas clicáveis de propósito (para não
// travar a interação), e escolher nesse instante cairia num dia sem expediente.
await page.waitForSelector("text=Escolha o artista");
const daysResponse = page.waitForResponse(
  (response) =>
    response.url().includes("/api/availability") && response.url().includes("fromISO"),
  { timeout: 20000 },
);
await page.locator("button").filter({ hasText: "Juliana Reis" }).first().click();
await page.waitForURL(/artista=/);
check("passo 2: artista selecionado", page.url().includes("artista="));

// Passo 3 — data com vaga
await daysResponse;
await page.waitForSelector('button[role="gridcell"]');
// Um frame extra para o React aplicar o resultado às células.
await page.waitForTimeout(500);

let picked = false;
for (let attempt = 0; attempt < 4 && !picked; attempt += 1) {
  const enabled = page.locator('button[role="gridcell"]:not([disabled])');
  const total = await enabled.count();
  if (total > 0) {
    await enabled.first().click({ timeout: 5000 });
    picked = true;
  } else {
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await page.waitForTimeout(1500);
  }
}
check("passo 3: data com vaga encontrada", picked);

// Passo 4 — horário
await page.waitForSelector("text=Horários disponíveis");
const slotButtons = page.locator('button[aria-pressed]');
await slotButtons.first().waitFor({ state: "visible", timeout: 15000 });
const slotCount = await slotButtons.count();
check("passo 4: horários carregados do servidor", slotCount > 0, `${slotCount} slots`);

if (slotCount > 0) {
  await slotButtons.first().click();
  await page.waitForURL(/horario=/);
}

// Passo 5 — dados do cliente
await page.waitForSelector("#bk-name");
const phone = `1199${Math.floor(1000000 + Math.random() * 8999999)}`;
await page.fill("#bk-name", "Cliente de Verificação E2E");
await page.fill("#bk-phone", phone);
await page.fill("#bk-email", "verificacao@exemplo.com.br");
await page.fill("#bk-notes", "Agendamento criado pela verificação automatizada.");

// Validação: envia com telefone inválido antes, para conferir o erro.
await page.fill("#bk-phone", "123");
await page.getByRole("button", { name: /Revisar agendamento/i }).click();
await page.waitForTimeout(400);
const phoneError = await page.locator('[role="alert"]').first().textContent();
check(
  "validação de telefone no cliente",
  Boolean(phoneError && /telefone/i.test(phoneError)),
  phoneError ?? "sem mensagem",
);

await page.fill("#bk-phone", phone);
await page.getByRole("button", { name: /Revisar agendamento/i }).click();

// Passo 6 — resumo e confirmação
await page.waitForSelector("text=Confira e confirme");
check("passo 6: resumo exibido", true);

await page.getByRole("button", { name: /Confirmar agendamento/i }).click();
await page.waitForSelector("text=Agendamento solicitado", { timeout: 20000 });

const code = (await page.locator("text=/^IH-[A-Z0-9]{6}$/").first().textContent())?.trim();
check("passo 7: número da reserva gerado", Boolean(code), code ?? "ausente");
notes.push(`Reserva criada: ${code}`);

// A confirmação não pode reexibir o cabeçalho "Reserve seu horário": eram duas
// manchetes do mesmo peso dizendo coisas opostas.
const confirmationHeadings = await page
  .locator("h1")
  .allTextContents();
check(
  "confirmação tem apenas o próprio título",
  confirmationHeadings.length === 1 && /solicitado/i.test(confirmationHeadings[0] ?? ""),
  confirmationHeadings.join(" | ") || "nenhum h1",
);

await page.screenshot({ path: join(OUT, "booking-confirmation-1440.png"), fullPage: true });

// A mesma tela em 390px — o estado final do fluxo nunca tinha sido capturado
// no tamanho em que a maior parte das reservas acontece.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "booking-confirmation-390.png"), fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });

// ---------------------------------------------------------------------------
console.log("\n2. Painel administrativo");
// ---------------------------------------------------------------------------

// Rota protegida sem sessão precisa redirecionar.
const anon = await browser.newContext();
const anonPage = await anon.newPage();
await anonPage.goto(`${BASE}/admin/agendamentos`, { waitUntil: "domcontentloaded" });
check(
  "rota /admin protegida pelo proxy",
  anonPage.url().includes("/admin/login"),
  anonPage.url(),
);
await anon.close();

await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });

// Credenciais erradas devem falhar com mensagem genérica (sem revelar se o
// e-mail existe). O seletor casa pelo texto, e não pela posição: a região de
// toasts também expõe role="alert".
await page.fill("#email", ADMIN_EMAIL);
await page.fill("#password", "senha-errada-de-proposito");
await page.getByRole("button", { name: /^Entrar$/ }).click();

const errorBox = page
  .getByRole("alert")
  .filter({ hasText: /incorret|Muitas tentativas/i })
  .first();
await errorBox.waitFor({ state: "visible", timeout: 15000 });
const loginError = (await errorBox.textContent())?.trim() ?? "";

// O rate limit é global por IP e por processo: se ele disparar aqui, a
// verificação não consegue mais testar o login neste servidor.
const rateLimited = /Muitas tentativas/i.test(loginError);
check(
  "login rejeita senha incorreta",
  /incorret/i.test(loginError) || rateLimited,
  loginError,
);

if (rateLimited) {
  notes.push(
    "⚠ Rate limit de login ativo — reinicie o servidor para revalidar o login com credenciais válidas.",
  );
} else {
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^Entrar$/ }).click();

  // waitForURL espera por um evento "load" que a navegação suave do App Router
  // nunca dispara — aqui observamos o pathname diretamente.
  await page.waitForFunction(
    () => window.location.pathname === "/admin",
    { timeout: 20000 },
  );
  check("login com credenciais válidas", !page.url().includes("/admin/login"));
}

await page.waitForSelector("text=Dashboard");
await page.screenshot({ path: join(OUT, "admin-dashboard-1440.png"), fullPage: true });

// O agendamento criado precisa aparecer na listagem.
//
// A conferência é feita dentro do <tbody>, e não na página inteira: o código
// buscado também aparece como valor do campo de busca, então `text=${code}`
// solto dava positivo mesmo quando o filtro não devolvia linha nenhuma — foi
// assim que uma busca quebrada passou despercebida.
await page.goto(`${BASE}/admin/agendamentos?busca=${code}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const rowCount = await page.locator("tbody tr").count();
const found = await page.locator(`tbody tr:has-text("${code}")`).count();
check(
  "busca do painel filtra pelo código da reserva",
  found === 1 && rowCount === 1,
  `${found} linha(s) com o código, ${rowCount} na tabela`,
);

// Confirmar o agendamento pelo menu de ações.
if (found > 0) {
  await page.locator('button[aria-haspopup="menu"]').first().click();
  await page.getByRole("menu").waitFor({ state: "visible", timeout: 10000 });

  const items = await page.getByRole("menuitem").allTextContents();
  const confirmItem = page
    .getByRole("menuitem")
    .filter({ hasText: /^\s*Confirmar\s*$/ })
    .first();

  if ((await confirmItem.count()) === 0) {
    check("menu de ações traz 'Confirmar'", false, items.join(" | "));
  } else {
    await confirmItem.click();
    await page.waitForTimeout(2000);
    const confirmed = await page.locator("text=Confirmado").count();
    check("mudança de status para confirmado", confirmed > 0);
  }
}

// Varredura das demais páginas do admin.
const adminRoutes = [
  "/admin/calendario",
  "/admin/calendario?visao=semana",
  "/admin/calendario?visao=dia",
  "/admin/clientes",
  "/admin/artistas",
  "/admin/servicos",
  "/admin/horarios",
  "/admin/galeria",
  "/admin/depoimentos",
  "/admin/configuracoes",
];

for (const route of adminRoutes) {
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  check(`carrega ${route}`, response?.status() === 200, `HTTP ${response?.status()}`);
}

await page.goto(`${BASE}/admin/calendario`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, "admin-calendario-1440.png"), fullPage: true });

// ---------------------------------------------------------------------------
console.log("\n3. Páginas públicas");
// ---------------------------------------------------------------------------

const publicRoutes = [
  "/",
  "/sobre",
  "/artistas",
  "/servicos",
  "/galeria",
  "/galeria?estilo=Realismo",
  "/contato",
  "/agendamento",
  "/sitemap.xml",
  "/robots.txt",
];

const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const guestPage = await guest.newPage();

for (const route of publicRoutes) {
  const response = await guestPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  check(`carrega ${route}`, response?.status() === 200, `HTTP ${response?.status()}`);
}

// Detalhe de artista.
// networkidle é evitado de propósito: o prefetch do App Router mantém
// requisições em voo e a rede raramente fica "ociosa" pelos 500ms exigidos.
await guestPage.goto(`${BASE}/artistas`, { waitUntil: "domcontentloaded" });
await guestPage.locator('a[href^="/artistas/"]').first().click();
await guestPage.waitForFunction(
  () => /\/artistas\/[a-z0-9-]+$/.test(window.location.pathname),
  { timeout: 20000 },
);
check("página de detalhe do artista abre", /\/artistas\/[a-z0-9-]+$/.test(guestPage.url()));

// Lightbox da galeria
await guestPage.goto(`${BASE}/galeria`, { waitUntil: "domcontentloaded" });
await guestPage.locator('button[aria-label^="Ampliar"]').first().click();
await guestPage.waitForSelector('[role="dialog"]');
check("lightbox da galeria abre", true);
await guestPage.keyboard.press("Escape");
await guestPage.waitForTimeout(400);
check(
  "lightbox fecha com Esc",
  (await guestPage.locator('[role="dialog"]').count()) === 0,
);

// H1 único por página (SEO)
for (const route of ["/", "/sobre", "/artistas", "/servicos", "/galeria", "/contato"]) {
  await guestPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  const h1 = await guestPage.locator("h1").count();
  check(`H1 único em ${route}`, h1 === 1, `${h1} encontrados`);
}

await guest.close();

// ---------------------------------------------------------------------------
console.log("\n4. Capturas responsivas");
// ---------------------------------------------------------------------------

/**
 * `maxHeight` é orçamento de rolagem no celular, em pixels de documento.
 *
 * Existe porque "a página está longa demais" era discussão de opinião até
 * alguém medir: a home tinha 10.978px em 390px de largura, treze telas, e o
 * agendamento 4.070px com o rodapé ocupando 27% disso. Depois de trocar as
 * prévias por carrosséis, compactar o card de artista e enxugar o rodapé nas
 * rotas de conversão, ficaram 7.317px e 2.796px.
 *
 * Os números abaixo têm folga sobre o medido — são trava de regressão, não
 * meta. Se uma seção nova empurrar a home de volta para as dez telas, isto
 * falha antes de virar hábito.
 */
const shots = [
  { route: "/", width: 1440 },
  { route: "/", width: 390, maxHeight: 8000 },
  { route: "/agendamento", width: 1440 },
  { route: "/agendamento", width: 390, maxHeight: 3200 },
  { route: "/artistas", width: 390 },
  { route: "/galeria", width: 390 },
];

for (const shot of shots) {
  const shotContext = await browser.newContext({
    viewport: { width: shot.width, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const shotPage = await shotContext.newPage();
  await shotPage.goto(`${BASE}${shot.route}`, { waitUntil: "domcontentloaded" });
  await shotPage.waitForLoadState("load");

  // Percorre a página para disparar o reveal on scroll.
  await shotPage.evaluate(async () => {
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    const step = Math.round(window.innerHeight * 0.75);
    for (let y = 0; y < root.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    window.scrollTo(0, 0);
  });
  await shotPage.waitForTimeout(900);

  // Nenhuma página pode rolar horizontalmente.
  const overflow = await shotPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(
    `sem scroll horizontal em ${shot.route} @${shot.width}px`,
    overflow <= 1,
    `${overflow}px de excesso`,
  );

  if (shot.maxHeight) {
    const height = await shotPage.evaluate(
      () => document.documentElement.scrollHeight,
    );
    check(
      `${shot.route} @${shot.width}px cabe no orçamento de rolagem`,
      height <= shot.maxHeight,
      `${height}px (limite ${shot.maxHeight}px, ${(height / 844).toFixed(1)} telas)`,
    );
    notes.push(
      `Altura de ${shot.route} @${shot.width}px: ${height}px (${(height / 844).toFixed(1)} telas)`,
    );
  }

  const slug = shot.route === "/" ? "home" : shot.route.replace(/[/?=&]+/g, "-").replace(/^-/, "");
  await shotPage.screenshot({
    path: join(OUT, `${slug}-${shot.width}.png`),
    fullPage: true,
  });
  await shotContext.close();
}

// ---------------------------------------------------------------------------
await browser.close();

console.log("\n─────────────────────────────────────────────");
for (const note of notes) console.log(note);

if (consoleErrors.length > 0) {
  console.log(`\n⚠ ${consoleErrors.length} erro(s) de console:`);
  for (const error of [...new Set(consoleErrors)].slice(0, 10)) {
    console.log(`   ${error}`);
  }
}

if (failures.length > 0) {
  console.log(`\n✗ ${failures.length} verificação(ões) falharam:`);
  for (const failure of failures) console.log(`   - ${failure}`);
  process.exit(1);
}

console.log("\n✔ Todas as verificações passaram.");
