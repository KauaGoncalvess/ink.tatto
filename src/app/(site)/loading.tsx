import { LogoMark } from "@/components/site/brand";

/**
 * Estado de carregamento das rotas públicas.
 *
 * Deliberadamente minimalista: um pulso na marca. Um esqueleto detalhado
 * competiria com o conteúdo real e piscaria em navegações rápidas, que é o
 * caso comum aqui — as páginas do site são estáticas ou revalidadas.
 */
export default function SiteLoading() {
  return (
    <div
      className="grid min-h-[70dvh] place-items-center px-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <LogoMark className="size-10 animate-pulse text-blood-500" />
        <span className="overline text-ash-600">Carregando</span>
      </div>
    </div>
  );
}
