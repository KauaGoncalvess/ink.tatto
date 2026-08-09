/**
 * Manifesto único de imagens.
 *
 * Todo slot de imagem do site é declarado aqui, com o caminho local, o texto
 * alternativo e a proporção. Nenhum componente escreve um caminho de imagem
 * literal — assim, trocar a fotografia é editar este arquivo (ou apenas
 * substituir o arquivo em /public/images mantendo o nome).
 *
 * Fluxo de substituição:
 *   1. `npm run images:placeholders` gera os placeholders on-brand.
 *   2. `npm run images:fetch` baixa uma curadoria de fotos reais para os
 *      MESMOS caminhos — o site troca de placeholder para fotografia sem
 *      alterar uma linha de código.
 *   3. Ou solte suas próprias fotos em /public/images/<pasta>/<arquivo>.
 */

export type ImageSlot = {
  /** Caminho público servido pelo Next. */
  src: string;
  /** Texto alternativo. Obrigatório — é o que o leitor de tela anuncia. */
  alt: string;
  /** Proporção largura/altura usada para gerar o placeholder no tamanho certo. */
  ratio: number;
  /** Descrição da fotografia ideal para este slot. Guia o script de download
   *  e serve de briefing caso o estúdio fotografe o próprio material. */
  brief: string;
};

const slot = (
  folder: string,
  file: string,
  alt: string,
  ratio: number,
  brief: string,
): ImageSlot => ({
  src: `/images/${folder}/${file}`,
  alt,
  ratio,
  brief,
});

// ---------------------------------------------------------------------------
// Hero e blocos de destaque
// ---------------------------------------------------------------------------

export const heroImages = {
  main: slot(
    "hero",
    "tattoo-machine.jpg",
    "Mão com luva preta segurando uma máquina de tatuagem sob luz baixa",
    3 / 4,
    "Close cinematográfico de uma mão enluvada segurando a máquina de tatuagem. Fundo preto, contraluz dura, alto contraste, muito espaço negativo à direita para o título.",
  ),
  ctaBackground: slot(
    "hero",
    "cta-skin.jpg",
    "Agulha da máquina de tatuagem tocando a pele durante uma sessão",
    16 / 9,
    "Macro da agulha encostando na pele, gotas de tinta, profundidade de campo curta, tons frios de cinza com um ponto de vermelho.",
  ),
} satisfies Record<string, ImageSlot>;

// ---------------------------------------------------------------------------
// Estúdio
// ---------------------------------------------------------------------------

export const studioImages = {
  interior: slot(
    "studio",
    "interior.jpg",
    "Interior do estúdio de tatuagem com iluminação baixa e maca preta",
    4 / 5,
    "Interior escuro do estúdio: maca de couro preto, luminária de braço, quadros na parede. Iluminação quente pontual contra paredes escuras.",
  ),
  workstation: slot(
    "studio",
    "workstation.jpg",
    "Bancada de tatuagem organizada com tintas, agulhas e equipamentos esterilizados",
    3 / 2,
    "Bancada vista de cima: potes de tinta, agulhas lacradas, filme plástico, luvas pretas. Composição gráfica e limpa.",
  ),
  detail: slot(
    "studio",
    "ink-detail.jpg",
    "Detalhe de potes de tinta preta sobre superfície escura",
    1,
    "Macro de tinta preta escorrendo em um pote, reflexo mínimo, fundo praticamente preto.",
  ),
  team: slot(
    "studio",
    "team.jpg",
    "Tatuador preparando o equipamento antes de uma sessão",
    3 / 2,
    "Artista de costas preparando a máquina, foco no equipamento, ambiente escuro com respiro.",
  ),
} satisfies Record<string, ImageSlot>;

// ---------------------------------------------------------------------------
// Artistas — os arquivos seguem o slug cadastrado no banco.
// ---------------------------------------------------------------------------

export const ARTIST_IMAGE_FOLDER = "artists";
export const ARTIST_IMAGE_RATIO = 4 / 5;

/** Caminho do retrato de um artista a partir do slug. */
export function artistImagePath(slug: string): string {
  return `/images/${ARTIST_IMAGE_FOLDER}/${slug}.jpg`;
}

// ---------------------------------------------------------------------------
// Serviços — os arquivos seguem o slug cadastrado no banco.
// ---------------------------------------------------------------------------

export const SERVICE_IMAGE_FOLDER = "services";
export const SERVICE_IMAGE_RATIO = 3 / 2;

export function serviceImagePath(slug: string): string {
  return `/images/${SERVICE_IMAGE_FOLDER}/${slug}.jpg`;
}

// ---------------------------------------------------------------------------
// Galeria — numeradas para permitir substituição em lote.
// ---------------------------------------------------------------------------

export const GALLERY_IMAGE_FOLDER = "gallery";
export const GALLERY_IMAGE_COUNT = 20;

export function galleryImagePath(index: number): string {
  return `/images/${GALLERY_IMAGE_FOLDER}/work-${String(index).padStart(2, "0")}.jpg`;
}

// ---------------------------------------------------------------------------
// Depoimentos — avatares.
// ---------------------------------------------------------------------------

export const TESTIMONIAL_IMAGE_FOLDER = "testimonials";

export function testimonialAvatarPath(index: number): string {
  return `/images/${TESTIMONIAL_IMAGE_FOLDER}/client-${String(index).padStart(2, "0")}.jpg`;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/** Usado quando o banco aponta para uma imagem que não existe mais. */
export const FALLBACK_IMAGE = "/images/placeholder.svg";

/**
 * SVG chapado na cor de fundo, usado como `blurDataURL` do next/image.
 * Evita o flash claro entre o layout e a imagem carregada.
 *
 * Literal em vez de `Buffer.from(...)` de propósito: este módulo é importado
 * também por componentes de cliente, onde `Buffer` não existe.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMwZDBkMTAiLz48L3N2Zz4=";
