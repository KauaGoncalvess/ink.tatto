/**
 * Camada de grão sobre toda a página.
 *
 * Gerada por feTurbulence em SVG inline — sem imagem, sem requisição, sem
 * custo de banda. É o detalhe que tira o "chapado digital" do fundo preto e
 * aproxima a página da textura de uma fotografia.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 opacity-[0.035] mix-blend-overlay"
    >
      <svg width="100%" height="100%">
        <filter id="page-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#page-grain)" />
      </svg>
    </div>
  );
}
