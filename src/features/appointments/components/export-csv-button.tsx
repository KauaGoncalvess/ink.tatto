"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Exporta a listagem atual em CSV.
 *
 * Repassa os filtros da URL para a rota de exportação, então o arquivo contém
 * exatamente o que está na tela — nada de "exportar tudo" quando o operador
 * filtrou por um artista e um período.
 */
export function ExportCsvButton() {
  const params = useSearchParams();

  const search = new URLSearchParams(params.toString());
  search.delete("pagina");

  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={`/api/admin/export?${search}`}
        // download deixa explícito que é arquivo, e não navegação.
        download
      >
        Exportar CSV
        <Download aria-hidden="true" />
      </a>
    </Button>
  );
}
