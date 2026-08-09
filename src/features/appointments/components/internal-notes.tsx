"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { updateAppointmentNotes } from "@/features/appointments/actions";

/** Anotações internas do agendamento — nunca exibidas ao cliente. */
export function InternalNotes({ id, value }: { id: string; value: string }) {
  const [notes, setNotes] = React.useState(value);
  const [pending, setPending] = React.useState(false);

  const dirty = notes !== value;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await updateAppointmentNotes({ id, internalNotes: notes });
      if (result.ok) toast.success(result.message ?? "Anotações salvas.");
      else toast.error(result.error);
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Anotações internas"
        description="Visível apenas para a equipe do estúdio"
      />
      <form onSubmit={handleSubmit} className="p-5">
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          placeholder="Observações sobre o projeto, sinal pago, preferências do cliente…"
          aria-label="Anotações internas"
        />
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-xs text-ash-600">{notes.length}/2000</span>
          <Button type="submit" size="sm" isLoading={pending} disabled={!dirty}>
            Salvar
            <Save aria-hidden="true" />
          </Button>
        </div>
      </form>
    </Panel>
  );
}
