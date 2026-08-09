"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, NativeSelect } from "@/components/ui/field";
import { rescheduleAppointment } from "@/features/appointments/actions";
import { useAvailableSlots } from "@/features/booking/use-availability";

/**
 * Remarcação pelo painel.
 *
 * Mostra os horários livres do artista na data escolhida (mesma API do site),
 * mas permite digitar um horário fora da grade — o estúdio às vezes precisa
 * encaixar. O que o servidor não permite, em nenhum caso, é sobrepor outro
 * agendamento.
 */
export function RescheduleForm({
  id,
  currentArtistId,
  currentDateISO,
  currentTime,
  serviceId,
  artists,
}: {
  id: string;
  currentArtistId: string;
  currentDateISO: string;
  currentTime: string;
  serviceId: string;
  artists: { id: string; name: string; serviceIds: string[] }[];
}) {
  const router = useRouter();

  const [artistId, setArtistId] = React.useState(currentArtistId);
  const [dateISO, setDateISO] = React.useState(currentDateISO);
  const [time, setTime] = React.useState(currentTime);
  const [pending, setPending] = React.useState(false);

  // Horários livres do artista na data escolhida, só como sugestão: o
  // formulário permite encaixe manual fora da grade.
  const availability = useAvailableSlots({ artistId, serviceId, dateISO });
  const slots = availability.slots.map((slot) => slot.time);

  // Artistas que executam este serviço aparecem primeiro na lista.
  const eligible = React.useMemo(
    () => artists.filter((artist) => artist.serviceIds.includes(serviceId)),
    [artists, serviceId],
  );

  const unchanged =
    artistId === currentArtistId && dateISO === currentDateISO && time === currentTime;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await rescheduleAppointment({ id, artistId, dateISO, time });
      if (result.ok) {
        toast.success(result.message ?? "Agendamento remarcado.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Remarcar"
        description="Alterar artista, data ou horário desta sessão"
      />

      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="rs-artist">Artista</Label>
            <NativeSelect
              id="rs-artist"
              value={artistId}
              onChange={(event) => setArtistId(event.target.value)}
            >
              {eligible.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
              {/* Artistas que não executam este serviço continuam
                  selecionáveis, mas sinalizados. */}
              {artists
                .filter((artist) => !artist.serviceIds.includes(serviceId))
                .map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name} (não executa este serviço)
                  </option>
                ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="rs-date">Data</Label>
            <Input
              id="rs-date"
              type="date"
              value={dateISO}
              onChange={(event) => setDateISO(event.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="rs-time">Horário</Label>
            <Input
              id="rs-time"
              type="time"
              step={300}
              value={time}
              list={`slots-${id}`}
              onChange={(event) => setTime(event.target.value)}
              aria-describedby={`rs-time-hint-${id}`}
            />
            {/* datalist: sugere os horários livres sem impedir o encaixe manual */}
            <datalist id={`slots-${id}`}>
              {slots.map((slot) => (
                <option key={slot} value={slot} />
              ))}
            </datalist>
            <FieldHint id={`rs-time-hint-${id}`}>
              {availability.isLoading
                ? "Consultando a agenda…"
                : slots.length > 0
                  ? `Livres: ${slots.slice(0, 6).join(", ")}${slots.length > 6 ? "…" : ""}`
                  : "Nenhum horário livre nesta data — só encaixe manual."}
            </FieldHint>
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" size="sm" isLoading={pending} disabled={unchanged}>
            Remarcar
            <CalendarClock aria-hidden="true" />
          </Button>
        </div>
      </form>
    </Panel>
  );
}
