"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/field";

/**
 * Campo de busca das listagens do painel.
 *
 * O termo vive na URL (?busca=), então a busca é compartilhável e o botão
 * voltar do navegador funciona. O debounce evita uma navegação por tecla.
 */
export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const current = params.get("busca") ?? "";
  const [value, setValue] = React.useState(current);
  const [isPending, startTransition] = React.useTransition();

  // Mantém o campo sincronizado quando a URL muda por fora (voltar/avançar do
  // navegador). Ajuste de estado durante a renderização — é o padrão indicado
  // pelo React para derivar estado de props, e evita a renderização em cascata
  // que um efeito provocaria.
  const [lastUrlValue, setLastUrlValue] = React.useState(current);
  if (current !== lastUrlValue) {
    setLastUrlValue(current);
    setValue(current);
  }

  React.useEffect(() => {
    if (value === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("busca", value);
      else next.delete("busca");

      startTransition(() => {
        router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, current, params, pathname, router]);

  return (
    <div className="surface flex items-center gap-3 p-3">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ash-600"
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-11"
        />
      </div>

      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="grid size-10 shrink-0 place-items-center border border-hairline text-ash-400 transition-colors hover:bg-ink-800 hover:text-bone-100"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Limpar busca</span>
        </button>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {isPending ? "Buscando…" : ""}
      </span>
    </div>
  );
}
