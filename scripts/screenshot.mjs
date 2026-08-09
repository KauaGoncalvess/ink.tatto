/**
 * Captura telas do site em execução, para conferir o resultado visual e a
 * responsividade de verdade — não por suposição.
 *
 * Uso:  node scripts/screenshot.mjs <baseUrl> <saída> [rota:largura[:altura]]...
 * Ex.:  node scripts/screenshot.mjs http://127.0.0.1:3100 .verification /:1440 /:390
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

const [baseUrl = "http://127.0.0.1:3100", outDir = ".verification", ...targets] =
  process.argv.slice(2);

const jobs = (targets.length > 0 ? targets : ["/:1440", "/:390"]).map((target) => {
  const [route, width = "1440", height] = target.split(":");
  return {
    route,
    width: Number(width),
    height: height ? Number(height) : undefined,
  };
});

await mkdir(outDir, { recursive: true });

/**
 * Reaproveita o Chromium já instalado na imagem quando ele existe. Sem isto, o
 * Playwright procura a build exata da versão do pacote e falha pedindo
 * `playwright install`, que não é possível em ambiente sem rede para CDN.
 */
const localChromium = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({
  ...(existsSync(localChromium) ? { executablePath: localChromium } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const job of jobs) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.height ?? 900 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(`${baseUrl}${job.route}`, { waitUntil: "networkidle" });

  // Percorre a página inteira antes de capturar. O reveal on scroll depende do
  // IntersectionObserver: sem passar pela viewport, as seções abaixo da dobra
  // continuariam em opacity 0 e sairiam em branco no fullPage.
  await page.evaluate(async () => {
    // O site usa `scroll-behavior: smooth`, então cada scrollTo programático
    // vira uma animação e chamadas seguidas se cancelam — a página nunca chega
    // à posição pedida e metade das seções não entra na viewport. Desligamos
    // durante a varredura e devolvemos no fim.
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const step = Math.round(window.innerHeight * 0.75);
    for (let y = 0; y < root.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  });

  // Dá tempo das transições de entrada terminarem.
  await page.waitForTimeout(1200);

  const slug = job.route === "/" ? "home" : job.route.replace(/[/?=&]+/g, "-").replace(/^-/, "");
  const file = join(outDir, `${slug}-${job.width}.png`);

  await page.screenshot({ path: file, fullPage: job.height === undefined });
  console.log(`✓ ${file}${errors.length ? `  ⚠ ${errors.length} erro(s) no console` : ""}`);
  for (const error of errors.slice(0, 5)) console.log(`   ${error}`);

  await context.close();
}

await browser.close();
