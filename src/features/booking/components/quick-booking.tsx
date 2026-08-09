"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, PenTool, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Label, NativeSelect } from "@/components/ui/field";
import { Eyebrow } from "@/components/site/section";
import { Reveal } from "@/components/site/reveal";
import { useAvailableSlots } from "@/features/booking/use-availability";
import { addDaysISO, todayISO } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Bloco "Agendamento online" da home.
 *
 * É uma porta de entrada, não um formulário completo: coleta as quatro
 * escolhas principais e leva ao wizard com tudo pré-selecionado via query
 * string. Manter o estado na URL é o que permite o card do artista linkar
 * direto para "agendar com este artista" sem duplicar lógica.
 *
 * Os horários são carregados do servidor conforme o usuário escolhe — nada de
 * mostrar grade fake que depois se revela indisponível.
 */

export type QuickBookingArtist = {
  id: string;
  name: string;
  handle: string | null;
  serviceIds: string[];
};

export type QuickBookingService = {
  id: string;
  name: string;
  durationMin: number;
};

type Props = {
  artists: QuickBookingArtist[];
  services: QuickBookingService[];
  /** Antecedência mínima, usada para calcular a primeira data selecionável. */
  minLeadTimeHours: number;
  maxAdvanceDays: number;
  className?: string;
};

export function QuickBooking({
  artists,
  services,
  minLeadTimeHours,
  maxAdvanceDays,
  className,
}: Props) {
  const router = useRouter();

  const [artistId, setArtistId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [dateISO, setDateISO] = React.useState("");
  const [time, setTime] = React.useState("");

  // Consulta declarativa: o hook cuida de cancelamento, respostas fora de
  // ordem e do estado de carregamento derivado.
  const availability = useAvailableSlots({ artistId, serviceId, dateISO });
  const { slots } = availability;

  const today = todayISO();
  // Com antecedência mínima acima de um dia, a primeira data possível já
  // avança — evita o usuário escolher uma data que o servidor recusaria.
  const minDate = addDaysISO(today, Math.floor(minLeadTimeHours / 24));
  const maxDate = addDaysISO(today, maxAdvanceDays);

  // Artistas compatíveis com o serviço escolhido, e vice-versa.
  const availableArtists = React.useMemo(
    () =>
      serviceId
        ? artists.filter((artist) => artist.serviceIds.includes(serviceId))
        : artists,
    [artists, serviceId],
  );

  const availableServices = React.useMemo(() => {
    if (!artistId) return services;
    const artist = artists.find((entry) => entry.id === artistId);
    if (!artist) return services;
    return services.filter((service) => artist.serviceIds.includes(service.id));
  }, [artistId, artists, services]);

  // Um horário só continua válido enquanto estiver na lista devolvida pelo
  // servidor: trocar artista, serviço ou data o invalida automaticamente.
  // Derivar em vez de limpar por efeito elimina a renderização em cascata e o
  // instante em que a interface mostraria um horário que já não existe.
  const effectiveTime = slots.some((slot) => slot.time === time) ? time : "";

  const canSubmit = Boolean(artistId && serviceId && dateISO && effectiveTime);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const params = new URLSearchParams({
      servico: serviceId,
      artista: artistId,
      data: dateISO,
      horario: effectiveTime,
      passo: "dados",
    });
    router.push(`/agendamento?${params}`);
  }

  return (
    <Reveal
      as="section"
      aria-labelledby="agendamento-rapido"
      className={cn("relative", className)}
    >
      <div className="surface-raised relative overflow-hidden">
        {/* Textura de canto — quebra o retângulo sem poluir. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[radial-gradient(circle,rgba(200,16,46,0.09),transparent_70%)]"
        />

        <div className="relative px-6 py-10 sm:px-10 md:px-12 md:py-14">
          <div className="text-center">
            <Eyebrow align="center">Agendamento online</Eyebrow>
            <h2
              id="agendamento-rapido"
              className="display-title mt-5 text-[clamp(1.75rem,4.5vw,3rem)]"
            >
              Escolha artista, serviço e horário
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ash-400">
              Selecione as opções abaixo e veja em tempo real os horários que
              ainda estão livres na agenda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Field>
                <Label htmlFor="qb-artist">
                  <span className="inline-flex items-center gap-2">
                    <User className="size-3 text-blood-500" aria-hidden="true" />
                    Escolha o artista
                  </span>
                </Label>
                <NativeSelect
                  id="qb-artist"
                  value={artistId}
                  onChange={(event) => {
                    setArtistId(event.target.value);
                    // Se o serviço atual não é executado por este artista,
                    // limpa aqui — na origem da mudança, não num efeito.
                    const next = artists.find((a) => a.id === event.target.value);
                    if (serviceId && next && !next.serviceIds.includes(serviceId)) {
                      setServiceId("");
                    }
                  }}
                >
                  <option value="">Selecione</option>
                  {availableArtists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                      {artist.handle ? ` — ${artist.handle}` : ""}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <Label htmlFor="qb-service">
                  <span className="inline-flex items-center gap-2">
                    <PenTool className="size-3 text-blood-500" aria-hidden="true" />
                    Serviço
                  </span>
                </Label>
                <NativeSelect
                  id="qb-service"
                  value={serviceId}
                  onChange={(event) => {
                    setServiceId(event.target.value);
                    const artist = artists.find((a) => a.id === artistId);
                    if (artist && !artist.serviceIds.includes(event.target.value)) {
                      setArtistId("");
                    }
                  }}
                >
                  <option value="">Selecione</option>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <Label htmlFor="qb-date">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-3 text-blood-500" aria-hidden="true" />
                    Data
                  </span>
                </Label>
                <input
                  id="qb-date"
                  type="date"
                  value={dateISO}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) => setDateISO(event.target.value)}
                  className="h-12 w-full border border-hairline border-b-2 border-b-ink-600 bg-ink-850 px-4 text-sm text-bone-100 transition-colors hover:border-b-ash-600 focus:border-b-blood-500 focus:bg-ink-800 focus:outline-none"
                />
              </Field>

              <Field>
                <Label htmlFor="qb-time">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-3 text-blood-500" aria-hidden="true" />
                    Horário
                  </span>
                </Label>
                <NativeSelect
                  id="qb-time"
                  value={effectiveTime}
                  disabled={availability.isLoading || slots.length === 0}
                  onChange={(event) => setTime(event.target.value)}
                  aria-describedby="qb-time-status"
                >
                  <option value="">
                    {availability.isLoading
                      ? "Carregando…"
                      : slots.length > 0
                        ? "Selecione"
                        : "Sem horários"}
                  </option>
                  {slots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            {/* Estado da consulta, anunciado a leitores de tela. */}
            <p
              id="qb-time-status"
              role="status"
              aria-live="polite"
              className={cn(
                "mt-4 text-xs",
                availability.failed ? "text-blood-400" : "text-ash-500",
              )}
            >
              {!availability.isReady
                ? "Selecione artista, serviço e data para ver os horários livres."
                : availability.isLoading
                  ? "Consultando a agenda…"
                  : availability.reason
                    ? availability.reason
                    : `${slots.length} ${slots.length === 1 ? "horário disponível" : "horários disponíveis"} nesta data.`}
            </p>

            <div className="mt-8 flex justify-center">
              <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto">
                Confirmar agendamento
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Reveal>
  );
}
