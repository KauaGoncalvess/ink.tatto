"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect } from "@/components/ui/field";
import { STATUS_LABELS } from "@/components/admin/ui";

/**
 * Filtros da listagem de agendamentos.
 *
 * O estado vive na URL: cada combinação de filtros é um link compartilhável e
 * o botão voltar funciona. A busca por texto é adiada (debounce) para não
 * disparar uma navegação a cada tecla.
 */
export function AppointmentFilters({
  artists,
  services,
}: {
  artists: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("busca") ?? "");
  const [isPending, startTransition] = React.useTransition();

  const apply = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      // Qualquer mudança de filtro volta para a primeira página.
      next.delete("pagina");

      startTransition(() => {
        router.replace(`${pathname}?${next}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  // Debounce da busca textual.
  React.useEffect(() => {
    const current = params.get("busca") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => apply({ busca: search || null }), 400);
    return () => clearTimeout(timer);
  }, [search, params, apply]);

  const hasFilters = ["status", "artista", "servico", "busca", "de", "ate"].some((key) =>
    params.get(key),
  );

  return (
    <section aria-label="Filtros" className="surface p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Field className="sm:col-span-2 xl:col-span-2">
          <Label htmlFor="filter-search">Buscar</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ash-600"
            />
            <Input
              id="filter-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone, e-mail ou código"
              className="pl-11"
            />
          </div>
        </Field>

        <Field>
          <Label htmlFor="filter-status">Status</Label>
          <NativeSelect
            id="filter-status"
            value={params.get("status") ?? ""}
            onChange={(event) => apply({ status: event.target.value || null })}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <Label htmlFor="filter-artist">Artista</Label>
          <NativeSelect
            id="filter-artist"
            value={params.get("artista") ?? ""}
            onChange={(event) => apply({ artista: event.target.value || null })}
          >
            <option value="">Todos</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <Label htmlFor="filter-from">De</Label>
          <Input
            id="filter-from"
            type="date"
            value={params.get("de") ?? ""}
            onChange={(event) => apply({ de: event.target.value || null })}
          />
        </Field>

        <Field>
          <Label htmlFor="filter-to">Até</Label>
          <Input
            id="filter-to"
            type="date"
            value={params.get("ate") ?? ""}
            onChange={(event) => apply({ ate: event.target.value || null })}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect
            aria-label="Filtrar por serviço"
            value={params.get("servico") ?? ""}
            onChange={(event) => apply({ servico: event.target.value || null })}
            className="h-10 w-auto min-w-48 text-xs"
          >
            <option value="">Todos os serviços</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </NativeSelect>

          <span
            role="status"
            aria-live="polite"
            className="text-xs text-ash-600"
          >
            {isPending ? "Atualizando…" : ""}
          </span>
        </div>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
          >
            <X aria-hidden="true" />
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </section>
  );
}
