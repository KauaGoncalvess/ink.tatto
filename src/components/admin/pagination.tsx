import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Paginação das listagens do painel.
 *
 * Links de verdade (e não botões com JavaScript): a página é compartilhável,
 * o botão voltar funciona e a navegação continua possível sem JS.
 */
export function Pagination({
  basePath,
  currentPage,
  pageCount,
  total,
  params,
}: {
  basePath: string;
  currentPage: number;
  pageCount: number;
  total: number;
  /** Demais filtros da URL, preservados na troca de página. */
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const buildHref = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "pagina") search.set(key, value);
    }
    if (page > 1) search.set("pagina", String(page));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-ash-500">
        Página <span className="tabular-nums text-bone-200">{currentPage}</span> de{" "}
        <span className="tabular-nums text-bone-200">{pageCount}</span> ·{" "}
        <span className="tabular-nums">{total}</span>{" "}
        {total === 1 ? "registro" : "registros"}
      </p>

      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(currentPage - 1)} rel="prev">
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
        )}

        {currentPage < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(currentPage + 1)} rel="next">
              Próxima
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
          </Button>
        )}
      </div>
    </nav>
  );
}
