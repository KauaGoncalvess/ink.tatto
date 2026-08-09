"use client";

import * as React from "react";

import { searchClients } from "@/features/appointments/admin-actions";

/**
 * Busca de clientes com debounce.
 *
 * Mesmo desenho do hook de disponibilidade: o estado guarda a qual consulta o
 * resultado pertence, e `isSearching` é derivado da comparação entre a chave
 * atual e a da resposta. Sem `setState` síncrono no corpo do efeito — que
 * provocaria uma renderização em cascata a cada tecla — e respostas fora de
 * ordem são descartadas naturalmente.
 */

export type ClientHit = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isBlocked: boolean;
};

const MIN_TERM = 2;
const DEBOUNCE_MS = 300;

export function useClientSearch(term: string, enabled = true) {
  const trimmed = term.trim();
  const key = enabled && trimmed.length >= MIN_TERM ? trimmed : "";

  const [state, setState] = React.useState<{ key: string; hits: ClientHit[] } | null>(
    null,
  );

  React.useEffect(() => {
    if (!key) return;

    let active = true;
    const timer = setTimeout(() => {
      searchClients(key)
        .then((hits) => {
          if (active) setState({ key, hits });
        })
        .catch(() => {
          if (active) setState({ key, hits: [] });
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key]);

  const current = state?.key === key ? state : null;

  return {
    hits: current?.hits ?? [],
    isSearching: Boolean(key) && current === null,
    /** O termo é curto demais para buscar? */
    isIdle: !key,
  };
}
