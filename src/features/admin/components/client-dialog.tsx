"use client";

import * as React from "react";

import { CrudDialog } from "@/features/admin/components/crud-dialog";
import { Field, FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { deleteClient, saveClient } from "@/features/admin/actions";

export type ClientFormData = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  isBlocked: boolean;
};

const EMPTY: ClientFormData = {
  id: "",
  name: "",
  phone: "",
  email: "",
  notes: "",
  isBlocked: false,
};

export function ClientDialog({
  mode,
  client,
}: {
  mode: "create" | "edit";
  client?: ClientFormData;
}) {
  const [form, setForm] = React.useState<ClientFormData>(client ?? EMPTY);

  // Reflete uma edição vinda do servidor (após router.refresh) sem efeito:
  // ajuste de estado durante a renderização é o padrão recomendado pelo React
  // para derivar estado de props e evita a renderização em cascata.
  const [source, setSource] = React.useState(client);
  if (client !== source) {
    setSource(client);
    setForm(client ?? EMPTY);
  }

  const patch = (values: Partial<ClientFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  return (
    <CrudDialog
      mode={mode}
      title={mode === "create" ? "Novo cliente" : "Editar cliente"}
      description="O telefone é a chave de identificação: agendamentos com o mesmo número reaproveitam este cadastro."
      triggerLabel="Novo cliente"
      buildValues={() => ({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        isBlocked: form.isBlocked,
      })}
      onSave={saveClient}
      onDelete={mode === "edit" && form.id ? () => deleteClient(form.id) : undefined}
    >
      {({ errors, disabled }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="client-name" required>
                Nome completo
              </Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="client-phone" required>
                Telefone
              </Label>
              <Input
                id="client-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => patch({ phone: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.phone)}
                placeholder="(11) 98765-4321"
              />
              <FieldError>{errors.phone}</FieldError>
            </Field>
          </div>

          <Field>
            <Label htmlFor="client-email">E-mail</Label>
            <Input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(event) => patch({ email: event.target.value })}
              disabled={disabled}
              aria-invalid={Boolean(errors.email)}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="client-notes">Observações</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(event) => patch({ notes: event.target.value })}
              disabled={disabled}
              maxLength={1000}
              placeholder="Alergias, preferências de horário, projetos em andamento…"
            />
            <FieldHint>Visível apenas para a equipe do estúdio.</FieldHint>
          </Field>

          <Switch
            checked={form.isBlocked}
            onCheckedChange={(checked) => patch({ isBlocked: checked })}
            disabled={disabled}
            label="Bloquear agendamento online"
            hint="O cliente não consegue reservar pelo site, mas o estúdio ainda pode agendar pelo painel."
          />
        </>
      )}
    </CrudDialog>
  );
}
