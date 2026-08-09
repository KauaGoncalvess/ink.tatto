/**
 * Baixa uma curadoria de fotografias reais para /public/images.
 *
 * POR QUE ESTE SCRIPT EXISTE
 * O projeto foi construído num ambiente cuja política de rede bloqueia os CDNs
 * de banco de imagens, então as fotos não puderam ser baixadas lá. Rodando na
 * sua máquina (ou em qualquer ambiente com saída livre), este script preenche
 * exatamente os mesmos caminhos usados pelos placeholders — o site troca de
 * arte sem alterar uma linha de código.
 *
 * Uso:
 *   npm run images:fetch              # só o que ainda é placeholder
 *   npm run images:fetch -- --force   # rebaixa tudo
 *
 * As fotos vêm do Unsplash sob a licença Unsplash (uso comercial permitido,
 * sem atribuição obrigatória). Ainda assim, creditar o fotógrafo é boa
 * prática — a lista de créditos é impressa ao final.
 *
 * Para usar as SUAS fotos, ignore este script e apenas substitua os arquivos
 * em /public/images mantendo os nomes.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  galleryImagePath,
  heroImages,
  studioImages,
  artistImagePath,
  serviceImagePath,
} from "../src/config/images";
import { ARTIST_SEED } from "../prisma/seed-data/artists";
import { SERVICE_SEED } from "../prisma/seed-data/services";

const PUBLIC_DIR = join(process.cwd(), "public");
const FORCE = process.argv.includes("--force");

/** Parâmetros de recorte por proporção, aplicados pelo CDN do Unsplash. */
const SIZES = {
  heroPortrait: "w=1200&h=1600&fit=crop&crop=entropy&q=80",
  wide: "w=1600&h=900&fit=crop&crop=entropy&q=80",
  portrait: "w=900&h=1125&fit=crop&crop=faces,entropy&q=80",
  square: "w=900&h=900&fit=crop&crop=entropy&q=80",
  gallery: "w=900&h=1200&fit=crop&crop=entropy&q=80",
} as const;

type Photo = {
  /** Caminho público de destino (o mesmo do manifesto). */
  target: string;
  /** ID da foto no Unsplash. */
  id: string;
  size: keyof typeof SIZES;
  credit: string;
};

/**
 * Curadoria por slot. Os IDs foram escolhidos pelo briefing de cada slot
 * (ver `brief` em src/config/images.ts): fundo escuro, luz dura, alto
 * contraste e espaço negativo.
 */
const PHOTOS: Photo[] = [
  // Hero
  { target: heroImages.main.src, id: "photo-1590246814883-57c511e76523", size: "heroPortrait", credit: "Nimble Made" },
  { target: heroImages.ctaBackground.src, id: "photo-1568515387631-8b650bbcdb90", size: "wide", credit: "Allef Vinicius" },

  // Estúdio
  { target: studioImages.interior.src, id: "photo-1562962230-16e4623d36e6", size: "portrait", credit: "Lucas Lenzi" },
  { target: studioImages.workstation.src, id: "photo-1611501275019-9b5cda994e8d", size: "wide", credit: "Peter Fogden" },
  { target: studioImages.detail.src, id: "photo-1598371839696-5c5bb00bdc28", size: "square", credit: "Kristian Angelo" },
  { target: studioImages.team.src, id: "photo-1565058379802-bbe93b2f703a", size: "wide", credit: "Benjamin Lehman" },
];

/** Retratos dos artistas — ordem estável para casar com o seed. */
const ARTIST_PHOTO_IDS = [
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1500648767791-00dcc994a43e",
  "photo-1494790108377-be9c29b29330",
  "photo-1519085360753-af0119f7cbe7",
  "photo-1506794778202-cad84cf45f1d",
];

ARTIST_SEED.forEach((artist, index) => {
  PHOTOS.push({
    target: artistImagePath(artist.slug),
    id: ARTIST_PHOTO_IDS[index % ARTIST_PHOTO_IDS.length]!,
    size: "portrait",
    credit: "Unsplash",
  });
});

/** Imagens de serviço. */
const SERVICE_PHOTO_IDS = [
  "photo-1611501275019-9b5cda994e8d",
  "photo-1565058379802-bbe93b2f703a",
  "photo-1598371839696-5c5bb00bdc28",
  "photo-1562962230-16e4623d36e6",
  "photo-1590246814883-57c511e76523",
  "photo-1568515387631-8b650bbcdb90",
  "photo-1607779097040-26e80aa78e66",
  "photo-1519017640105-c2d61b0b8e40",
];

SERVICE_SEED.forEach((service, index) => {
  PHOTOS.push({
    target: serviceImagePath(service.slug),
    id: SERVICE_PHOTO_IDS[index % SERVICE_PHOTO_IDS.length]!,
    size: "wide",
    credit: "Unsplash",
  });
});

/** Trabalhos da galeria. */
const GALLERY_PHOTO_IDS = [
  "photo-1611501275019-9b5cda994e8d",
  "photo-1598371839696-5c5bb00bdc28",
  "photo-1565058379802-bbe93b2f703a",
  "photo-1562962230-16e4623d36e6",
  "photo-1568515387631-8b650bbcdb90",
  "photo-1590246814883-57c511e76523",
  "photo-1607779097040-26e80aa78e66",
  "photo-1519017640105-c2d61b0b8e40",
  "photo-1543059080-f9b1272213d5",
  "photo-1517649763962-0c623066013b",
];

for (let index = 1; index <= 20; index += 1) {
  PHOTOS.push({
    target: galleryImagePath(index),
    id: GALLERY_PHOTO_IDS[(index - 1) % GALLERY_PHOTO_IDS.length]!,
    size: "gallery",
    credit: "Unsplash",
  });
}

function urlFor(photo: Photo): string {
  return `https://images.unsplash.com/${photo.id}?${SIZES[photo.size]}&auto=format&fm=jpg`;
}

async function download(photo: Photo): Promise<"ok" | "skip" | "fail"> {
  const target = join(PUBLIC_DIR, photo.target);

  if (existsSync(target) && !FORCE) return "skip";

  try {
    const response = await fetch(urlFor(photo), {
      headers: { "User-Agent": "ink-house-image-fetcher" },
    });

    if (!response.ok) {
      console.warn(`  ✗ ${photo.target} — HTTP ${response.status}`);
      return "fail";
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Sanidade: uma resposta muito pequena é página de erro, não fotografia.
    if (buffer.length < 5000) {
      console.warn(`  ✗ ${photo.target} — resposta suspeita (${buffer.length} bytes)`);
      return "fail";
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer);
    return "ok";
  } catch (error) {
    console.warn(
      `  ✗ ${photo.target} — ${error instanceof Error ? error.message : "falha de rede"}`,
    );
    return "fail";
  }
}

async function main() {
  console.log(
    `Baixando ${PHOTOS.length} imagens${FORCE ? " (sobrescrevendo as existentes)" : " (preservando as já baixadas)"}…\n`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  // Lotes pequenos: educado com o CDN e mais fácil de diagnosticar.
  const BATCH = 4;
  for (let index = 0; index < PHOTOS.length; index += BATCH) {
    const results = await Promise.all(
      PHOTOS.slice(index, index + BATCH).map(download),
    );
    for (const result of results) {
      if (result === "ok") ok += 1;
      else if (result === "skip") skipped += 1;
      else failed += 1;
    }
  }

  console.log(`\n✔ ${ok} baixadas · ${skipped} preservadas · ${failed} falharam`);

  if (failed > 0) {
    console.log(
      "\nAs que falharam continuam com o placeholder gerado — o site segue funcionando.\n" +
        "Rode de novo, ou substitua manualmente os arquivos em /public/images.",
    );
  }

  console.log(
    "\nFotografias sob a licença Unsplash (uso comercial permitido).\n" +
      "Créditos: " +
      [...new Set(PHOTOS.map((photo) => photo.credit))].join(", "),
  );
}

main().catch((error) => {
  console.error("[images:fetch] falhou:", error);
  process.exit(1);
});
