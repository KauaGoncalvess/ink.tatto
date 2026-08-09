/**
 * Gera os placeholders on-brand de /public/images.
 *
 * Não são caixas cinzas: cada arquivo é uma composição escura com grão,
 * vinheta, um fio vermelho e uma silhueta abstrata derivada do próprio nome
 * do slot — o resultado parece intencional dentro da identidade do estúdio
 * enquanto a fotografia real não chega.
 *
 * Uso:  npm run images:placeholders
 *       npm run images:placeholders -- --force   (sobrescreve fotos existentes)
 *
 * O script NUNCA sobrescreve um arquivo existente sem --force, para que
 * `images:fetch` ou as fotos do próprio estúdio não sejam perdidas.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import sharp from "sharp";

import {
  GALLERY_IMAGE_COUNT,
  galleryImagePath,
  heroImages,
  studioImages,
  testimonialAvatarPath,
} from "../src/config/images";
import { ARTIST_SEED } from "../prisma/seed-data/artists";
import { SERVICE_SEED } from "../prisma/seed-data/services";
import { artistImagePath, serviceImagePath } from "../src/config/images";

const PUBLIC_DIR = join(process.cwd(), "public");
const FORCE = process.argv.includes("--force");

/**
 * Paleta derivada dos tokens de globals.css, com um desvio proposital: a fonte
 * de luz puxa para o quente (tungstênio), que é como um estúdio de tatuagem
 * realmente é iluminado. Cinzas neutros no escuro deixariam a imagem azulada.
 */
const PALETTE = {
  ink950: "#08080a",
  ink900: "#0d0d10",
  ink800: "#141418",
  highlight: "#5c5147",
  midtone: "#302b27",
  ash600: "#4a4a52",
  bone: "#f2f0ed",
  blood: "#c8102e",
};

/** Hash determinístico — o mesmo slot gera sempre a mesma composição. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** PRNG determinístico a partir do hash. */
function rng(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

type Composition = "portrait" | "wide" | "square" | "avatar";

/**
 * Monta o SVG da composição. A ideia é sugerir fotografia: gradiente radial
 * como fonte de luz, formas orgânicas de baixa opacidade como profundidade,
 * grão via feTurbulence e vinheta forte nas bordas.
 */
function buildSvg(
  width: number,
  height: number,
  seed: string,
  label: string,
  kind: Composition,
): string {
  const random = rng(seed);
  const min = Math.min(width, height);

  // Luz-chave alta e lateral, como um softbox apontado de cima — deixa o
  // enquadramento com direção em vez de um degradê chapado.
  const lightX = 22 + random() * 30;
  const lightY = 12 + random() * 28;
  const rotation = -25 + random() * 50;

  // Volumes de fumaça/penumbra: são eles que dão profundidade fotográfica.
  const blobs = Array.from({ length: 7 }, (_, i) => {
    // Concentra as manchas claras perto da luz-chave e as escuras longe dela.
    const towardsLight = i < 3;
    const cx = towardsLight
      ? (lightX / 100) * width + (random() - 0.5) * width * 0.5
      : random() * width;
    const cy = towardsLight
      ? (lightY / 100) * height + (random() - 0.5) * height * 0.45
      : random() * height;
    const r = (0.2 + random() * 0.32) * min;
    const opacity = towardsLight
      ? (0.18 + random() * 0.16).toFixed(3)
      : (0.3 + random() * 0.3).toFixed(3);
    const fill = towardsLight ? PALETTE.highlight : PALETTE.ink950;
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * (0.5 + random() * 0.7)).toFixed(0)}" fill="${fill}" opacity="${opacity}" transform="rotate(${(random() * 360).toFixed(0)} ${cx.toFixed(0)} ${cy.toFixed(0)})"/>`;
  }).join("");

  // Traços finos captando a luz — sugerem agulha, cabo e linha de contorno.
  const strokeCount = kind === "avatar" ? 0 : 5 + Math.floor(random() * 4);
  const strokes = Array.from({ length: strokeCount }, (_, i) => {
    const x1 = random() * width;
    const y1 = random() * height * 0.9;
    const len = (0.3 + random() * 0.55) * Math.max(width, height);
    const angle = (rotation + (random() - 0.5) * 22) * (Math.PI / 180);
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    const bright = i % 3 === 0;
    return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${bright ? PALETTE.bone : PALETTE.ash600}" stroke-width="${bright ? 1 : 2}" opacity="${bright ? 0.14 : 0.3}"/>`;
  }).join("");

  // Fio vermelho: o mesmo motivo gráfico usado nas seções do site.
  const ruleY = height * (0.62 + random() * 0.2);
  const ruleW = width * (0.12 + random() * 0.16);
  const ruleX = width * 0.08;

  const fontSize = Math.max(9, Math.round(Math.min(width, height) * 0.035));
  const showLabel = kind !== "avatar" && Math.min(width, height) >= 180;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="light" cx="${lightX}%" cy="${lightY}%" r="82%">
      <stop offset="0%" stop-color="${PALETTE.highlight}"/>
      <stop offset="30%" stop-color="${PALETTE.midtone}"/>
      <stop offset="65%" stop-color="${PALETTE.ink900}"/>
      <stop offset="100%" stop-color="${PALETTE.ink950}"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
      <stop offset="45%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.7"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed="${hash(seed) % 100}" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.6"/>
      </feComponentTransfer>
    </filter>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${(min * 0.055).toFixed(1)}"/>
    </filter>
    <filter id="softenLines" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="${(min * 0.004).toFixed(2)}"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#light)"/>
  <g filter="url(#soften)">${blobs}</g>
  <g filter="url(#softenLines)">${strokes}</g>
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.14" style="mix-blend-mode:overlay"/>
  ${
    kind === "avatar"
      ? ""
      : `<rect x="${ruleX.toFixed(0)}" y="${ruleY.toFixed(0)}" width="${ruleW.toFixed(0)}" height="${Math.max(2, min * 0.004).toFixed(0)}" fill="${PALETTE.blood}"/>`
  }
  ${
    showLabel
      ? `<text x="${ruleX.toFixed(0)}" y="${(ruleY + fontSize * 2.4).toFixed(0)}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600" letter-spacing="${(fontSize * 0.24).toFixed(1)}" fill="${PALETTE.bone}" opacity="0.55">${label.toUpperCase()}</text>`
      : ""
  }
</svg>`;
}

type Job = {
  path: string;
  width: number;
  height: number;
  label: string;
  kind: Composition;
};

function job(publicPath: string, width: number, height: number, label: string, kind: Composition): Job {
  return { path: publicPath, width, height, label, kind };
}

function collectJobs(): Job[] {
  const jobs: Job[] = [];

  // Hero — o slot mais importante, resolução alta e vertical como a referência.
  jobs.push(job(heroImages.main.src, 1200, 1600, "Ink House", "portrait"));
  jobs.push(job(heroImages.ctaBackground.src, 1920, 1080, "Sua história", "wide"));

  // Estúdio
  jobs.push(job(studioImages.interior.src, 1000, 1250, "Estúdio", "portrait"));
  jobs.push(job(studioImages.workstation.src, 1400, 933, "Bancada", "wide"));
  jobs.push(job(studioImages.detail.src, 900, 900, "Tinta", "square"));
  jobs.push(job(studioImages.team.src, 1400, 933, "Preparo", "wide"));

  // Artistas — um retrato por slug cadastrado no seed.
  for (const artist of ARTIST_SEED) {
    jobs.push(job(artistImagePath(artist.slug), 800, 1000, artist.name, "portrait"));
  }

  // Serviços
  for (const service of SERVICE_SEED) {
    jobs.push(job(serviceImagePath(service.slug), 1200, 800, service.name, "wide"));
  }

  // Galeria
  for (let i = 1; i <= GALLERY_IMAGE_COUNT; i += 1) {
    // Alterna proporções para o masonry não ficar monótono.
    const tall = i % 3 === 0;
    jobs.push(
      job(galleryImagePath(i), 900, tall ? 1300 : 1125, `Trabalho ${i}`, "portrait"),
    );
  }

  // Avatares de depoimento
  for (let i = 1; i <= 8; i += 1) {
    jobs.push(job(testimonialAvatarPath(i), 200, 200, `Cliente ${i}`, "avatar"));
  }

  return jobs;
}

async function main() {
  const jobs = collectJobs();
  let written = 0;
  let skipped = 0;

  for (const item of jobs) {
    const target = join(PUBLIC_DIR, item.path);
    mkdirSync(dirname(target), { recursive: true });

    if (existsSync(target) && !FORCE) {
      skipped += 1;
      continue;
    }

    const svg = buildSvg(item.width, item.height, item.path, item.label, item.kind);
    const buffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer();

    writeFileSync(target, buffer);
    written += 1;
  }

  // Fallback vetorial usado quando o banco aponta para um arquivo removido.
  const fallbackPath = join(PUBLIC_DIR, "images", "placeholder.svg");
  mkdirSync(dirname(fallbackPath), { recursive: true });
  writeFileSync(fallbackPath, buildSvg(1200, 900, "fallback", "Ink House", "wide"));

  console.log(
    `[placeholders] ${written} gerados, ${skipped} preservados (use --force para sobrescrever).`,
  );
}

main().catch((error) => {
  console.error("[placeholders] falhou:", error);
  process.exit(1);
});
