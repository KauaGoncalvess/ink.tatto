"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createAppointmentAsAdmin } from "@/features/appointments/admin-actions";
import {
  useClientSearch,
  type ClientHit,
} from "@/features/appointments/use-client-search";
import { useAvailableSlots } from "@/features/booking/use-availability";
import { todayISO } from "@/lib/datetime";
import { cn, formatPhone } from "@/lib/utils";

/**
 * Agendamento criado pelo próprio estúdio.
 *
 * É o fluxo de quem atende por telefone: busca o cliente no cadastro (ou cria
 * na hora), escolhe artista, serviço e horário, e pode forçar um encaixe fora
 * da grade. Distinto do wizard público, que assume visitante anônimo e nunca
 * permite exceção de agenda.
 */

export function NewAppointmentDialog({
  artists,
  services,
}: {
  artists: { id: string; name: string; serviceIds: string[] }[];
  services: { id: string; name: string; durationMin: number }[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Novo agendamento
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>
            Para atendimento por telefone ou presencial. Busque um cliente já
            cadastrado ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        {/* Montado só com o diálogo aberto: o formulário nasce limpo a cada
            abertura, sem precisar de efeito para resetar. */}
        <NewAppointmentForm
          artists={artists}
          services={services}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentForm({
  artists,
  services,
  onDone,
}: {
  artists: { id: string; name: string; serviceIds: string[] }[];
  services: { id: string; name: string; durationMin: number }[];
  onDone: () => void;
}) {
  const router = useRouter();

  const [serviceId, setServiceId] = React.useState("");
  const [artistId, setArtistId] = React.useState("");
  const [dateISO, setDateISO] = React.useState(todayISO());
  const [time, setTime] = React.useState("");
  const [status, setStatus] = React.useState<"PENDING" | "CONFIRMED">("CONFIRMED");
  const [priceOverride, setPriceOverride] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [allowOutside, setAllowOutside] = React.useState(false);

  // Cliente: existente (selecionado na busca) ou novo.
  const [selectedClient, setSelectedClient] = React.useState<ClientHit | null>(null);
  const [clientTerm, setClientTerm] = React.useState("");
  const [newClient, setNewClient] = React.useState({ name: "", phone: "", email: "" });

  const { hits, isSearching } = useClientSearch(clientTerm, !selectedClient);

  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const eligibleArtists = React.useMemo(
    () =>
      serviceId ? artists.filter((a) => a.serviceIds.includes(serviceId)) : artists,
    [artists, serviceId],
  );

  const availability = useAvailableSlots({ artistId, serviceId, dateISO });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const client = selectedClient
      ? ({ mode: "existing", clientId: selectedClient.id } as const)
      : ({
          mode: "new",
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email,
        } as const);

    try {
      const result = await createAppointmentAsAdmin({
        client,
        serviceId,
        artistId,
        dateISO,
        time,
        status,
        priceOverride,
        internalNotes,
        allowOutsideSchedule: allowOutside,
      });

      if (result.ok) {
        toast.success(`${result.message} Código ${result.code}.`);
        onDone();
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

  const canSubmit =
    Boolean(serviceId && artistId && dateISO && time) &&
    (selectedClient !== null || (newClient.name.length >= 3 && newClient.phone.length >= 8));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Cliente */}
      <fieldset className="space-y-3">
        <legend className="overline mb-1 text-ash-400">Cliente</legend>

        {selectedClient ? (
          <div className="flex items-center gap-3 border border-blood-700 bg-blood-700/10 px-4 py-3">
            <Check className="size-4 shrink-0 text-blood-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-bone-100">
                {selectedClient.name}
              </p>
              <p className="truncate text-xs text-ash-400">
                {formatPhone(selectedClient.phone)}
                {selectedClient.email ? ` · ${selectedClient.email}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedClient(null);
                setClientTerm("");
              }}
              className="grid size-8 shrink-0 place-items-center border border-hairline text-ash-400 transition-colors hover:text-bone-100"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Trocar cliente</span>
            </button>
          </div>
        ) : (
          <>
            <Field>
              <Label htmlFor="na-search">Buscar no cadastro</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ash-600"
                />
                <Input
                  id="na-search"
                  value={clientTerm}
                  onChange={(event) => setClientTerm(event.target.value)}
                  placeholder="Nome, telefone ou e-mail"
                  className="pl-11"
                  autoComplete="off"
                />
              </div>
              <FieldHint>
                {isSearching
                  ? "Buscando…"
                  : "Deixe em branco para cadastrar um cliente novo."}
              </FieldHint>
            </Field>

            {hits.length > 0 ? (
              <ul className="max-h-48 divide-y divide-hairline overflow-y-auto border border-hairline">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(hit)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-800"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-bone-100">
                          {hit.name}
                          {hit.isBlocked ? (
                            <span className="ml-2 text-[0.625rem] uppercase tracking-wider text-blood-400">
                              bloqueado
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-ash-500">
                          {formatPhone(hit.phone)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Cadastro rápido */}
            <div className="border border-hairline p-4">
              <p className="mb-3 flex items-center gap-2 text-xs text-ash-400">
                <UserPlus className="size-3.5" aria-hidden="true" />
                Ou cadastre agora
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="na-name">Nome</Label>
                  <Input
                    id="na-name"
                    value={newClient.name}
                    onChange={(event) =>
                      setNewClient((c) => ({ ...c, name: event.target.value }))
                    }
                    aria-invalid={Boolean(errors["client.name"])}
                  />
                  <FieldError>{errors["client.name"]}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="na-phone">Telefone</Label>
                  <Input
                    id="na-phone"
                    type="tel"
                    value={newClient.phone}
                    onChange={(event) =>
                      setNewClient((c) => ({ ...c, phone: event.target.value }))
                    }
                    placeholder="(11) 98765-4321"
                    aria-invalid={Boolean(errors["client.phone"])}
                  />
                  <FieldError>{errors["client.phone"]}</FieldError>
                </Field>

                <Field className="sm:col-span-2">
                  <Label htmlFor="na-email">E-mail</Label>
                  <Input
                    id="na-email"
                    type="email"
                    value={newClient.email}
                    onChange={(event) =>
                      setNewClient((c) => ({ ...c, email: event.target.value }))
                    }
                    aria-invalid={Boolean(errors["client.email"])}
                  />
                  <FieldError>{errors["client.email"]}</FieldError>
                </Field>
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* Sessão */}
      <fieldset className="space-y-4">
        <legend className="overline mb-1 text-ash-400">Sessão</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="na-service" required>
              Serviço
            </Label>
            <NativeSelect
              id="na-service"
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
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="na-artist" required>
              Artista
            </Label>
            <NativeSelect
              id="na-artist"
              value={artistId}
              onChange={(event) => setArtistId(event.target.value)}
            >
              <option value="">Selecione</option>
              {eligibleArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="na-date" required>
              Data
            </Label>
            <Input
              id="na-date"
              type="date"
              value={dateISO}
              onChange={(event) => setDateISO(event.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="na-time" required>
              Horário
            </Label>
            <Input
              id="na-time"
              type="time"
              step={300}
              value={time}
              list="na-slots"
              onChange={(event) => setTime(event.target.value)}
            />
            {/* Sugere os livres sem impedir o encaixe manual. */}
            <datalist id="na-slots">
              {availability.slots.map((slot) => (
                <option key={slot.time} value={slot.time} />
              ))}
            </datalist>
            <FieldHint>
              {availability.isLoading
                ? "Consultando a agenda…"
                : availability.slots.length > 0
                  ? `Livres: ${availability.slots.slice(0, 6).map((s) => s.time).join(", ")}${availability.slots.length > 6 ? "…" : ""}`
                  : (availability.reason ?? "Escolha serviço, artista e data.")}
            </FieldHint>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="na-status">Status inicial</Label>
            <NativeSelect
              id="na-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "PENDING" | "CONFIRMED")
              }
            >
              <option value="CONFIRMED">Confirmado</option>
              <option value="PENDING">Pendente</option>
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="na-price">Valor (R$)</Label>
            <Input
              id="na-price"
              value={priceOverride}
              onChange={(event) => setPriceOverride(event.target.value)}
              placeholder="Deixe vazio para usar o preço do serviço"
              aria-invalid={Boolean(errors.priceOverride)}
            />
            <FieldError>{errors.priceOverride}</FieldError>
          </Field>
        </div>

        <Field>
          <Label htmlFor="na-notes">Anotações internas</Label>
          <Textarea
            id="na-notes"
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            maxLength={2000}
            className="min-h-20"
            placeholder="Sinal pago, detalhes combinados por telefone…"
          />
        </Field>

        <Switch
          checked={allowOutside}
          onCheckedChange={setAllowOutside}
          label="Permitir encaixe fora da grade"
          hint="Autoriza um horário fora do expediente padrão do artista. Sobreposição com outro agendamento continua bloqueada."
        />
      </fieldset>

      {formError ? (
        <p
          role="alert"
          className="border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
        >
          {formError}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={pending}
          disabled={!canSubmit}
          className={cn(!canSubmit && "cursor-not-allowed")}
        >
          Criar agendamento
          <Check aria-hidden="true" />
        </Button>
      </DialogFooter>
    </form>
  );
}
