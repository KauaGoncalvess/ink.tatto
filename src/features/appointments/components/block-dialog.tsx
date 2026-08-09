"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { createBlockedTime } from "@/features/appointments/actions";

/**
 * Criação de bloqueio de horário.
 *
 * Serve tanto para folga/férias de um artista quanto para fechar o estúdio
 * inteiro (artista vazio). O servidor avisa se o período cobre agendamentos já
 * marcados, mas não impede — quem decide entre remarcar ou cancelar é o
 * estúdio, não o sistema.
 */
export function BlockDialog({
  open,
  onOpenChange,
  artists,
  defaultArtistId,
  defaultDateISO,
  defaultTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artists: { id: string; name: string }[];
  defaultArtistId?: string;
  defaultDateISO: string;
  defaultTime: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [artistId, setArtistId] = React.useState(defaultArtistId ?? "");
  const [fromDateISO, setFromDateISO] = React.useState(defaultDateISO);
  const [fromTime, setFromTime] = React.useState(defaultTime);
  const [toDateISO, setToDateISO] = React.useState(defaultDateISO);
  const [toTime, setToTime] = React.useState(nextHour(defaultTime));
  const [reason, setReason] = React.useState("DAY_OFF");
  const [note, setNote] = React.useState("");

  // Reposiciona os campos quando o diálogo é aberto a partir de outro slot do
  // calendário. Ajuste durante a renderização (padrão recomendado pelo React
  // para derivar estado de props) em vez de efeito, que causaria um segundo
  // render com os valores antigos visíveis por um frame.
  const target = `${open}|${defaultArtistId ?? ""}|${defaultDateISO}|${defaultTime}`;
  const [lastTarget, setLastTarget] = React.useState(target);
  if (target !== lastTarget) {
    setLastTarget(target);
    if (open) {
      setArtistId(defaultArtistId ?? "");
      setFromDateISO(defaultDateISO);
      setToDateISO(defaultDateISO);
      setFromTime(defaultTime);
      setToTime(nextHour(defaultTime));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await createBlockedTime({
        artistId: artistId || undefined,
        fromDateISO,
        fromTime,
        toDateISO,
        toTime,
        reason,
        note: note || undefined,
      });

      if (result.ok) {
        toast.success(result.message ?? "Bloqueio criado.");
        onOpenChange(false);
        setNote("");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            O período fica indisponível para novos agendamentos pelo site.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field>
            <Label htmlFor="block-artist">Artista</Label>
            <NativeSelect
              id="block-artist"
              value={artistId}
              onChange={(event) => setArtistId(event.target.value)}
            >
              <option value="">Estúdio inteiro (todos os artistas)</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="block-from-date" required>
                Início
              </Label>
              <Input
                id="block-from-date"
                type="date"
                required
                value={fromDateISO}
                onChange={(event) => {
                  setFromDateISO(event.target.value);
                  // Mantém o fim coerente: nunca antes do início.
                  if (event.target.value > toDateISO) setToDateISO(event.target.value);
                }}
              />
              <Input
                type="time"
                aria-label="Horário de início"
                required
                value={fromTime}
                onChange={(event) => setFromTime(event.target.value)}
              />
            </Field>

            <Field>
              <Label htmlFor="block-to-date" required>
                Fim
              </Label>
              <Input
                id="block-to-date"
                type="date"
                required
                min={fromDateISO}
                value={toDateISO}
                onChange={(event) => setToDateISO(event.target.value)}
              />
              <Input
                type="time"
                aria-label="Horário de fim"
                required
                value={toTime}
                onChange={(event) => setToTime(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="block-reason">Motivo</Label>
            <NativeSelect
              id="block-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="DAY_OFF">Folga</option>
              <option value="VACATION">Férias</option>
              <option value="BREAK">Pausa</option>
              <option value="APPOINTMENT_HOLD">Horário reservado</option>
              <option value="OTHER">Outro</option>
            </NativeSelect>
          </Field>

          <Field>
            <Label htmlFor="block-note">Observação</Label>
            <Textarea
              id="block-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder="Convenção, manutenção, compromisso pessoal…"
              className="min-h-20"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={pending}>
              Criar bloqueio
              <Lock aria-hidden="true" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "09:00" -> "10:00", limitado a 23:59. */
function nextHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = Math.min(23, (h ?? 9) + 1);
  return `${String(hour).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}
