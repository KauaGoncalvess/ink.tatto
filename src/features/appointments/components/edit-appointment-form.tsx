"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader, STATUS_LABELS } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
  NativeSelect,
  Textarea,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { editAppointment } from "@/features/appointments/admin-actions";
import { useClientSearch } from "@/features/appointments/use-client-search";
import { useAvailableSlots } from "@/features/booking/use-availability";
import { formatPhone } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";

/**
 * Edição completa do agendamento.
 *
 * Substitui o formulário que só remarcava: aqui dá para trocar serviço (o que
 * muda a duração e portanto o fim da sessão), cliente, artista, status e
 * valor. É o caso real de quem marcou fine line e na conversa decidiu fazer
 * uma cobertura — antes só restava cancelar e refazer.
 */

export function EditAppointmentForm({
  id,
  code,
  current,
  artists,
  services,
}: {
  id: string;
  code: string;
  current: {
    clientId: string;
    clientName: string;
    clientPhone: string;
    artistId: string;
    serviceId: string;
    dateISO: string;
    time: string;
    status: AppointmentStatus;
    priceEstimate: number;
    internalNotes: string;
    cancelledReason: string;
  };
  artists: { id: string; name: string; serviceIds: string[] }[];
  services: { id: string; name: string; durationMin: number }[];
}) {
  const router = useRouter();

  const [clientId, setClientId] = React.useState(current.clientId);
  const [clientLabel, setClientLabel] = React.useState(
    `${current.clientName} · ${formatPhone(current.clientPhone)}`,
  );
  const [changingClient, setChangingClient] = React.useState(false);
  const [clientTerm, setClientTerm] = React.useState("");
  const { hits } = useClientSearch(clientTerm, changingClient);

  const [artistId, setArtistId] = React.useState(current.artistId);
  const [serviceId, setServiceId] = React.useState(current.serviceId);
  const [dateISO, setDateISO] = React.useState(current.dateISO);
  const [time, setTime] = React.useState(current.time);
  const [status, setStatus] = React.useState<AppointmentStatus>(current.status);
  const [price, setPrice] = React.useState(
    (current.priceEstimate / 100).toFixed(2).replace(".", ","),
  );
  const [internalNotes, setInternalNotes] = React.useState(current.internalNotes);
  const [cancelledReason, setCancelledReason] = React.useState(current.cancelledReason);
  const [allowOutside, setAllowOutside] = React.useState(true);

  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const availability = useAvailableSlots({ artistId, serviceId, dateISO });

  const selectedService = services.find((service) => service.id === serviceId);
  const serviceChanged = serviceId !== current.serviceId;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const result = await editAppointment({
        id,
        clientId,
        artistId,
        serviceId,
        dateISO,
        time,
        status,
        priceEstimate: price,
        internalNotes,
        cancelledReason,
        allowOutsideSchedule: allowOutside,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    } catch {
      setFormError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Editar agendamento"
        description={`Alterar qualquer dado de ${code}`}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
        {/* Cliente */}
        <Field>
          <Label>Cliente</Label>

          {changingClient ? (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ash-600"
                />
                <Input
                  value={clientTerm}
                  onChange={(event) => setClientTerm(event.target.value)}
                  placeholder="Buscar por nome, telefone ou e-mail"
                  className="pl-11"
                  autoComplete="off"
                  aria-label="Buscar cliente"
                />
              </div>

              {hits.length > 0 ? (
                <ul className="max-h-40 divide-y divide-hairline overflow-y-auto border border-hairline">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setClientId(hit.id);
                          setClientLabel(`${hit.name} · ${formatPhone(hit.phone)}`);
                          setChangingClient(false);
                          setClientTerm("");
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-bone-200 transition-colors hover:bg-ink-800"
                      >
                        {hit.name}
                        <span className="ml-2 text-xs text-ash-500">
                          {formatPhone(hit.phone)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setChangingClient(false);
                  setClientTerm("");
                }}
              >
                <X aria-hidden="true" />
                Manter o atual
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border border-hairline bg-ink-850 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm text-bone-100">
                {clientLabel}
              </span>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => setChangingClient(true)}
              >
                Trocar
              </Button>
            </div>
          )}
        </Field>

        {/* Sessão */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="ed-service" required>
              Serviço
            </Label>
            <NativeSelect
              id="ed-service"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              disabled={pending}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </NativeSelect>
            {serviceChanged && selectedService ? (
              <FieldHint>
                A duração muda para {selectedService.durationMin} min — o fim da
                sessão é recalculado.
              </FieldHint>
            ) : null}
          </Field>

          <Field>
            <Label htmlFor="ed-artist" required>
              Artista
            </Label>
            <NativeSelect
              id="ed-artist"
              value={artistId}
              onChange={(event) => setArtistId(event.target.value)}
              disabled={pending}
            >
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                  {artist.serviceIds.includes(serviceId)
                    ? ""
                    : " (não executa este serviço)"}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="ed-date" required>
              Data
            </Label>
            <Input
              id="ed-date"
              type="date"
              value={dateISO}
              onChange={(event) => setDateISO(event.target.value)}
              disabled={pending}
            />
          </Field>

          <Field>
            <Label htmlFor="ed-time" required>
              Horário
            </Label>
            <Input
              id="ed-time"
              type="time"
              step={300}
              value={time}
              list={`ed-slots-${id}`}
              onChange={(event) => setTime(event.target.value)}
              disabled={pending}
            />
            <datalist id={`ed-slots-${id}`}>
              {availability.slots.map((slot) => (
                <option key={slot.time} value={slot.time} />
              ))}
            </datalist>
            <FieldHint>
              {availability.isLoading
                ? "Consultando a agenda…"
                : availability.slots.length > 0
                  ? `Livres: ${availability.slots.slice(0, 5).map((s) => s.time).join(", ")}${availability.slots.length > 5 ? "…" : ""}`
                  : "Nenhum horário livre nesta data — só encaixe."}
            </FieldHint>
          </Field>

          <Field>
            <Label htmlFor="ed-status" required>
              Status
            </Label>
            <NativeSelect
              id="ed-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
              disabled={pending}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="ed-price">Valor (R$)</Label>
            <Input
              id="ed-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(errors.priceEstimate)}
            />
            <FieldError>{errors.priceEstimate}</FieldError>
          </Field>
        </div>

        {status === "CANCELLED" ? (
          <Field>
            <Label htmlFor="ed-reason">Motivo do cancelamento</Label>
            <Input
              id="ed-reason"
              value={cancelledReason}
              onChange={(event) => setCancelledReason(event.target.value)}
              disabled={pending}
              maxLength={300}
            />
          </Field>
        ) : null}

        <Field>
          <Label htmlFor="ed-notes">Anotações internas</Label>
          <Textarea
            id="ed-notes"
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            disabled={pending}
            maxLength={2000}
            className="min-h-20"
          />
        </Field>

        <Switch
          checked={allowOutside}
          onCheckedChange={setAllowOutside}
          disabled={pending}
          label="Permitir encaixe fora da grade"
          hint="Sobreposição com outro agendamento continua bloqueada em qualquer caso."
        />

        {formError ? (
          <p
            role="alert"
            className="border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" isLoading={pending}>
            Salvar alterações
            <Save aria-hidden="true" />
          </Button>
        </div>
      </form>
    </Panel>
  );
}
