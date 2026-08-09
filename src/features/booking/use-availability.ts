"use client";

import * as React from "react";

/**
 * Consulta de disponibilidade no cliente.
 *
 * O estado é modelado como "a resposta que tenho pertence a qual consulta?".
 * `loading` é derivado da comparação entre a chave atual e a chave da resposta
 * guardada — nada de `setLoading(true)` no corpo do efeito, que provoca uma
 * renderização em cascata a cada mudança de seleção.
 *
 * Como efeito colateral positivo, respostas fora de ordem deixam de ser um
 * problema: uma resposta lenta de uma seleção antiga chega com a chave errada
 * e é simplesmente ignorada.
 */

type Slot = { time: string };

type SlotsResponse = {
  slots: Slot[];
  reason?: string;
};

type SlotsState = {
  key: string;
  slots: Slot[];
  reason: string | null;
  failed: boolean;
};

export type UseSlotsResult = {
  slots: Slot[];
  /** Mensagem explicando por que não há horários, quando aplicável. */
  reason: string | null;
  isLoading: boolean;
  failed: boolean;
  /** A consulta está completa o bastante para ser feita? */
  isReady: boolean;
};

export function useAvailableSlots({
  artistId,
  serviceId,
  dateISO,
}: {
  artistId: string;
  serviceId: string;
  dateISO: string;
}): UseSlotsResult {
  const isReady = Boolean(artistId && serviceId && dateISO);
  const key = isReady ? `${artistId}|${serviceId}|${dateISO}` : "";

  const [state, setState] = React.useState<SlotsState | null>(null);

  React.useEffect(() => {
    if (!key) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ artistId, serviceId, dateISO });

    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as SlotsResponse;
      })
      .then((data) => {
        setState({
          key,
          slots: data.slots ?? [],
          reason: data.slots?.length ? null : (data.reason ?? "Sem horários nesta data."),
          failed: false,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          key,
          slots: [],
          reason: "Não foi possível carregar os horários. Tente novamente.",
          failed: true,
        });
      });

    return () => controller.abort();
  }, [key, artistId, serviceId, dateISO]);

  const current = state?.key === key ? state : null;

  return {
    slots: current?.slots ?? [],
    reason: current?.reason ?? null,
    isLoading: isReady && current === null,
    failed: current?.failed ?? false,
    isReady,
  };
}

/**
 * Dias com pelo menos um horário livre num intervalo.
 * `null` enquanto carrega — o calendário usa isso para não desabilitar tudo
 * antes de saber a resposta.
 */
export function useAvailableDays({
  artistId,
  serviceId,
  fromISO,
  toISO,
}: {
  artistId: string;
  serviceId: string;
  fromISO: string;
  toISO: string;
}): string[] | null {
  const key = artistId && serviceId ? `${artistId}|${serviceId}|${fromISO}|${toISO}` : "";
  const [state, setState] = React.useState<{ key: string; days: string[] } | null>(null);

  React.useEffect(() => {
    if (!key) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ artistId, serviceId, fromISO, toISO });

    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { days?: string[] };
      })
      .then((data) => setState({ key, days: data.days ?? [] }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Falha na varredura do mês: devolve lista vazia em vez de travar o
        // calendário. A consulta do dia dá o veredito final.
        setState({ key, days: [] });
      });

    return () => controller.abort();
  }, [key, artistId, serviceId, fromISO, toISO]);

  return state?.key === key ? state.days : null;
}
