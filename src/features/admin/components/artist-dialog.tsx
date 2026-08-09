"use client";

import * as React from "react";
import { X } from "lucide-react";

import { CrudDialog } from "@/features/admin/components/crud-dialog";
import {
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
  Textarea,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { deleteArtist, saveArtist } from "@/features/admin/actions";
import { WEEKDAY_LABELS } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type ScheduleDay = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

export type ArtistFormData = {
  id: string;
  name: string;
  handle: string;
  shortBio: string;
  bio: string;
  specialties: string[];
  yearsOfExp: string;
  instagram: string;
  phone: string;
  email: string;
  avatarUrl: string;
  isActive: boolean;
  acceptsBooking: boolean;
  displayOrder: string;
  serviceIds: string[];
  schedule: ScheduleDay[];
};

const EMPTY: ArtistFormData = {
  id: "",
  name: "",
  handle: "",
  shortBio: "",
  bio: "",
  specialties: [],
  yearsOfExp: "0",
  instagram: "",
  phone: "",
  email: "",
  avatarUrl: "",
  isActive: true,
  acceptsBooking: true,
  displayOrder: "0",
  serviceIds: [],
  schedule: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    // Segunda a sexta ativas por padrão — é a configuração mais comum.
    isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  })),
};

export function ArtistDialog({
  mode,
  artist,
  services,
}: {
  mode: "create" | "edit";
  artist?: ArtistFormData;
  services: { id: string; name: string }[];
}) {
  const [form, setForm] = React.useState<ArtistFormData>(artist ?? EMPTY);
  const [specialtyDraft, setSpecialtyDraft] = React.useState("");

  // Reflete uma edição vinda do servidor (após router.refresh) sem efeito:
  // ajuste de estado durante a renderização é o padrão recomendado pelo React
  // para derivar estado de props e evita a renderização em cascata.
  const [source, setSource] = React.useState(artist);
  if (artist !== source) {
    setSource(artist);
    setForm(artist ?? EMPTY);
  }

  const patch = (values: Partial<ArtistFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  function patchDay(dayOfWeek: number, values: Partial<ScheduleDay>) {
    setForm((current) => ({
      ...current,
      schedule: current.schedule.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...values } : day,
      ),
    }));
  }

  function addSpecialty() {
    const value = specialtyDraft.trim();
    if (!value || form.specialties.includes(value) || form.specialties.length >= 8) {
      return;
    }
    patch({ specialties: [...form.specialties, value] });
    setSpecialtyDraft("");
  }

  return (
    <CrudDialog
      mode={mode}
      size="lg"
      title={mode === "create" ? "Novo artista" : "Editar artista"}
      description="A grade semanal define quando este artista pode receber agendamentos pelo site."
      triggerLabel="Novo artista"
      buildValues={() => ({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        handle: form.handle,
        shortBio: form.shortBio,
        bio: form.bio,
        specialties: form.specialties,
        yearsOfExp: form.yearsOfExp,
        instagram: form.instagram,
        phone: form.phone,
        email: form.email,
        avatarUrl: form.avatarUrl,
        isActive: form.isActive,
        acceptsBooking: form.acceptsBooking,
        displayOrder: form.displayOrder,
        serviceIds: form.serviceIds,
        schedule: form.schedule.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isActive: day.isActive,
          startTime: day.startTime,
          endTime: day.endTime,
          breakStart: day.breakStart,
          breakEnd: day.breakEnd,
        })),
      })}
      onSave={saveArtist}
      onDelete={mode === "edit" && form.id ? () => deleteArtist(form.id) : undefined}
    >
      {({ errors, disabled }) => (
        <>
          {/* Identidade */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="art-name" required>
                Nome
              </Label>
              <Input
                id="art-name"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="art-handle">Apelido artístico</Label>
              <Input
                id="art-handle"
                value={form.handle}
                onChange={(event) => patch({ handle: event.target.value })}
                disabled={disabled}
                placeholder="Como o artista é conhecido"
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="art-short" required>
              Bio curta
            </Label>
            <Input
              id="art-short"
              value={form.shortBio}
              onChange={(event) => patch({ shortBio: event.target.value })}
              disabled={disabled}
              maxLength={200}
              aria-invalid={Boolean(errors.shortBio)}
              placeholder="Uma linha para o card da home."
            />
            <FieldError>{errors.shortBio}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="art-bio" required>
              Bio completa
            </Label>
            <Textarea
              id="art-bio"
              value={form.bio}
              onChange={(event) => patch({ bio: event.target.value })}
              disabled={disabled}
              maxLength={3000}
              className="min-h-32"
              aria-invalid={Boolean(errors.bio)}
            />
            <FieldError>{errors.bio}</FieldError>
          </Field>

          {/* Especialidades */}
          <Field>
            <Label htmlFor="art-specialty" required>
              Especialidades
            </Label>
            <div className="flex gap-2">
              <Input
                id="art-specialty"
                value={specialtyDraft}
                onChange={(event) => setSpecialtyDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter adiciona a etiqueta sem submeter o formulário.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSpecialty();
                  }
                }}
                disabled={disabled || form.specialties.length >= 8}
                placeholder="Realismo, Blackwork, Fine Line…"
              />
              <Button
                type="button"
                variant="subtle"
                onClick={addSpecialty}
                disabled={disabled || form.specialties.length >= 8}
              >
                Adicionar
              </Button>
            </div>

            {form.specialties.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {form.specialties.map((specialty) => (
                  <li key={specialty}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        patch({
                          specialties: form.specialties.filter((s) => s !== specialty),
                        })
                      }
                      className="inline-flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 text-xs text-bone-200 transition-colors hover:border-blood-500 hover:text-blood-400"
                    >
                      {specialty}
                      <X className="size-3" aria-hidden="true" />
                      <span className="sr-only">Remover {specialty}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <FieldError>{errors.specialties}</FieldError>
          </Field>

          {/* Contato */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="art-instagram">Instagram</Label>
              <Input
                id="art-instagram"
                value={form.instagram}
                onChange={(event) => patch({ instagram: event.target.value })}
                disabled={disabled}
                placeholder="https://instagram.com/perfil"
                aria-invalid={Boolean(errors.instagram)}
              />
              <FieldError>{errors.instagram}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="art-email">E-mail</Label>
              <Input
                id="art-email"
                type="email"
                value={form.email}
                onChange={(event) => patch({ email: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.email)}
              />
              <FieldError>{errors.email}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="art-avatar">Caminho da foto</Label>
              <Input
                id="art-avatar"
                value={form.avatarUrl}
                onChange={(event) => patch({ avatarUrl: event.target.value })}
                disabled={disabled}
                placeholder="/images/artists/nome.jpg"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label htmlFor="art-years">Anos de experiência</Label>
                <Input
                  id="art-years"
                  type="number"
                  min={0}
                  max={70}
                  value={form.yearsOfExp}
                  onChange={(event) => patch({ yearsOfExp: event.target.value })}
                  disabled={disabled}
                />
              </Field>
              <Field>
                <Label htmlFor="art-order">Ordem</Label>
                <Input
                  id="art-order"
                  type="number"
                  min={0}
                  max={999}
                  value={form.displayOrder}
                  onChange={(event) => patch({ displayOrder: event.target.value })}
                  disabled={disabled}
                />
              </Field>
            </div>
          </div>

          {/* Serviços executados */}
          <fieldset className="border-t border-hairline pt-5">
            <legend className="sr-only">Serviços executados</legend>
            <span className="overline mb-3 block text-ash-400">
              Serviços que este artista executa
            </span>

            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((service) => {
                const checked = form.serviceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm transition-colors",
                      checked
                        ? "border-blood-700 bg-blood-700/10 text-bone-100"
                        : "border-hairline text-ash-400 hover:border-hairline-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) =>
                        patch({
                          serviceIds: event.target.checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                      className="size-4 shrink-0 accent-[#c8102e]"
                    />
                    {service.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Grade semanal */}
          <fieldset className="border-t border-hairline pt-5">
            <legend className="sr-only">Grade semanal</legend>
            <span className="overline mb-1 block text-ash-400">Grade semanal</span>
            <FieldHint className="mb-3">
              Dias desativados não recebem agendamento. O intervalo é opcional.
            </FieldHint>

            <div className="space-y-2">
              {form.schedule.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className={cn(
                    "border px-3 py-3 transition-colors",
                    day.isActive ? "border-hairline-strong" : "border-hairline opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={day.isActive}
                        disabled={disabled}
                        onChange={(event) =>
                          patchDay(day.dayOfWeek, { isActive: event.target.checked })
                        }
                        className="size-4 accent-[#c8102e]"
                      />
                      <span className={day.isActive ? "text-bone-100" : "text-ash-500"}>
                        {WEEKDAY_LABELS[day.dayOfWeek]}
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <TimeInput
                        label={`Início de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                        value={day.startTime}
                        disabled={disabled || !day.isActive}
                        onChange={(value) => patchDay(day.dayOfWeek, { startTime: value })}
                      />
                      <span className="text-ash-600">até</span>
                      <TimeInput
                        label={`Fim de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                        value={day.endTime}
                        disabled={disabled || !day.isActive}
                        onChange={(value) => patchDay(day.dayOfWeek, { endTime: value })}
                      />

                      <span className="ml-2 text-ash-600">pausa</span>
                      <TimeInput
                        label={`Início da pausa de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                        value={day.breakStart}
                        disabled={disabled || !day.isActive}
                        onChange={(value) => patchDay(day.dayOfWeek, { breakStart: value })}
                      />
                      <span className="text-ash-600">–</span>
                      <TimeInput
                        label={`Fim da pausa de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                        value={day.breakEnd}
                        disabled={disabled || !day.isActive}
                        onChange={(value) => patchDay(day.dayOfWeek, { breakEnd: value })}
                      />
                    </div>
                  </div>

                  {/* Erros por dia vêm no formato schedule.<índice>.<campo> */}
                  <FieldError>
                    {errors[`schedule.${day.dayOfWeek}.endTime`] ??
                      errors[`schedule.${day.dayOfWeek}.breakEnd`] ??
                      errors[`schedule.${day.dayOfWeek}.breakStart`]}
                  </FieldError>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Situação */}
          <div className="space-y-4 border-t border-hairline pt-5">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => patch({ isActive: checked })}
              disabled={disabled}
              label="Perfil ativo"
              hint="Artistas inativos somem do site público."
            />
            <Switch
              checked={form.acceptsBooking}
              onCheckedChange={(checked) => patch({ acceptsBooking: checked })}
              disabled={disabled}
              label="Aceita agendamento online"
              hint="Desligue para manter o perfil no site sem receber novas reservas."
            />
          </div>
        </>
      )}
    </CrudDialog>
  );
}

function TimeInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-28 border border-hairline bg-ink-850 px-2 text-xs text-bone-100 transition-colors focus:border-blood-500 focus:outline-none disabled:opacity-40"
    />
  );
}
