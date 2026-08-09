"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader } from "@/components/admin/ui";
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
import { saveStudioSettings } from "@/features/admin/actions";
import type { OpeningHourRow } from "@/features/admin/components/opening-hours-form";
import { WEEKDAY_LABELS } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type SettingsFormData = {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  timezone: string;
  slotStepMin: string;
  minLeadTimeHours: string;
  maxAdvanceDays: string;
  openingHours: OpeningHourRow[];
};

/** Fusos brasileiros — evita erro de digitação num campo crítico da agenda. */
const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Manaus",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Noronha",
];

export function SettingsForm({ initial }: { initial: SettingsFormData }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const patch = (values: Partial<SettingsFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  function patchDay(dayOfWeek: number, values: Partial<OpeningHourRow>) {
    setForm((current) => ({
      ...current,
      openingHours: current.openingHours.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...values } : day,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      const result = await saveStudioSettings(form);
      if (result.ok) {
        toast.success(result.message ?? "Configurações salvas.");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Identidade */}
      <Panel>
        <PanelHeader
          title="Identidade"
          description="Nome e descrição exibidos no site e nos metadados"
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field>
            <Label htmlFor="set-name" required>
              Nome do estúdio
            </Label>
            <Input
              id="set-name"
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              disabled={pending}
              aria-invalid={Boolean(errors.name)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-tagline" required>
              Complemento
            </Label>
            <Input
              id="set-tagline"
              value={form.tagline}
              onChange={(event) => patch({ tagline: event.target.value })}
              disabled={pending}
              placeholder="Tattoo Studio"
            />
            <FieldError>{errors.tagline}</FieldError>
          </Field>

          <Field className="sm:col-span-2">
            <Label htmlFor="set-description" required>
              Descrição
            </Label>
            <Textarea
              id="set-description"
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              disabled={pending}
              maxLength={1000}
              aria-invalid={Boolean(errors.description)}
            />
            <FieldHint>Usada na meta description e no compartilhamento.</FieldHint>
            <FieldError>{errors.description}</FieldError>
          </Field>
        </div>
      </Panel>

      {/* Contato */}
      <Panel>
        <PanelHeader title="Contato e endereço" />
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <Label htmlFor="set-phone" required>
              Telefone
            </Label>
            <Input
              id="set-phone"
              value={form.phone}
              onChange={(event) => patch({ phone: event.target.value })}
              disabled={pending}
              placeholder="(11) 98765-4321"
            />
            <FieldError>{errors.phone}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-whatsapp" required>
              WhatsApp
            </Label>
            <Input
              id="set-whatsapp"
              value={form.whatsapp}
              onChange={(event) => patch({ whatsapp: event.target.value })}
              disabled={pending}
              placeholder="5511987654321"
              aria-invalid={Boolean(errors.whatsapp)}
            />
            <FieldHint>Somente dígitos, com DDI.</FieldHint>
            <FieldError>{errors.whatsapp}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-email" required>
              E-mail
            </Label>
            <Input
              id="set-email"
              type="email"
              value={form.email}
              onChange={(event) => patch({ email: event.target.value })}
              disabled={pending}
              aria-invalid={Boolean(errors.email)}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>

          <Field className="lg:col-span-2">
            <Label htmlFor="set-address" required>
              Endereço
            </Label>
            <Input
              id="set-address"
              value={form.address}
              onChange={(event) => patch({ address: event.target.value })}
              disabled={pending}
            />
            <FieldError>{errors.address}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-zip" required>
              CEP
            </Label>
            <Input
              id="set-zip"
              value={form.zip}
              onChange={(event) => patch({ zip: event.target.value })}
              disabled={pending}
            />
            <FieldError>{errors.zip}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-city" required>
              Cidade
            </Label>
            <Input
              id="set-city"
              value={form.city}
              onChange={(event) => patch({ city: event.target.value })}
              disabled={pending}
            />
            <FieldError>{errors.city}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-state" required>
              Estado (UF)
            </Label>
            <Input
              id="set-state"
              value={form.state}
              onChange={(event) =>
                patch({ state: event.target.value.toUpperCase().slice(0, 2) })
              }
              disabled={pending}
              maxLength={2}
              aria-invalid={Boolean(errors.state)}
            />
            <FieldError>{errors.state}</FieldError>
          </Field>
        </div>
      </Panel>

      {/* Redes */}
      <Panel>
        <PanelHeader title="Redes sociais" />
        <div className="grid gap-5 p-5 sm:grid-cols-3">
          {(["instagram", "facebook", "tiktok"] as const).map((network) => (
            <Field key={network}>
              <Label htmlFor={`set-${network}`} className="capitalize">
                {network}
              </Label>
              <Input
                id={`set-${network}`}
                value={form[network]}
                onChange={(event) => patch({ [network]: event.target.value })}
                disabled={pending}
                placeholder="https://…"
                aria-invalid={Boolean(errors[network])}
              />
              <FieldError>{errors[network]}</FieldError>
            </Field>
          ))}
        </div>
      </Panel>

      {/* Regras de agendamento */}
      <Panel>
        <PanelHeader
          title="Regras de agendamento"
          description="Definem quais horários o site oferece aos clientes"
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <Label htmlFor="set-timezone" required>
              Fuso horário
            </Label>
            <NativeSelect
              id="set-timezone"
              value={form.timezone}
              onChange={(event) => patch({ timezone: event.target.value })}
              disabled={pending}
            >
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </NativeSelect>
            <FieldError>{errors.timezone}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-step" required>
              Passo da grade (min)
            </Label>
            <Input
              id="set-step"
              type="number"
              min={5}
              max={120}
              step={5}
              value={form.slotStepMin}
              onChange={(event) => patch({ slotStepMin: event.target.value })}
              disabled={pending}
              aria-invalid={Boolean(errors.slotStepMin)}
            />
            <FieldHint>De quanto em quanto tempo os horários aparecem.</FieldHint>
            <FieldError>{errors.slotStepMin}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-lead" required>
              Antecedência mínima (h)
            </Label>
            <Input
              id="set-lead"
              type="number"
              min={0}
              max={720}
              value={form.minLeadTimeHours}
              onChange={(event) => patch({ minLeadTimeHours: event.target.value })}
              disabled={pending}
              aria-invalid={Boolean(errors.minLeadTimeHours)}
            />
            <FieldHint>Tempo mínimo entre a reserva e a sessão.</FieldHint>
            <FieldError>{errors.minLeadTimeHours}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="set-advance" required>
              Janela futura (dias)
            </Label>
            <Input
              id="set-advance"
              type="number"
              min={1}
              max={365}
              value={form.maxAdvanceDays}
              onChange={(event) => patch({ maxAdvanceDays: event.target.value })}
              disabled={pending}
              aria-invalid={Boolean(errors.maxAdvanceDays)}
            />
            <FieldHint>Até quantos dias à frente é possível agendar.</FieldHint>
            <FieldError>{errors.maxAdvanceDays}</FieldError>
          </Field>
        </div>
      </Panel>

      {/* Funcionamento */}
      <Panel>
        <PanelHeader
          title="Funcionamento"
          description="Nenhum artista pode atender fora desta janela"
        />
        <ul className="space-y-2 p-5">
          {form.openingHours.map((day, index) => (
            <li
              key={day.dayOfWeek}
              className={cn(
                "border px-3 py-3",
                day.isOpen ? "border-hairline-strong" : "border-hairline opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={day.isOpen}
                    disabled={pending}
                    onChange={(event) =>
                      patchDay(day.dayOfWeek, { isOpen: event.target.checked })
                    }
                    className="size-4 accent-[#c8102e]"
                  />
                  <span className={day.isOpen ? "text-bone-100" : "text-ash-500"}>
                    {WEEKDAY_LABELS[day.dayOfWeek]}
                  </span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="time"
                    aria-label={`Abertura de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                    value={day.opensAt}
                    disabled={pending || !day.isOpen}
                    onChange={(event) =>
                      patchDay(day.dayOfWeek, { opensAt: event.target.value })
                    }
                    className="h-9 w-28 border border-hairline bg-ink-850 px-2 text-xs text-bone-100 focus:border-blood-500 focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-ash-600">até</span>
                  <input
                    type="time"
                    aria-label={`Fechamento de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                    value={day.closesAt}
                    disabled={pending || !day.isOpen}
                    onChange={(event) =>
                      patchDay(day.dayOfWeek, { closesAt: event.target.value })
                    }
                    className="h-9 w-28 border border-hairline bg-ink-850 px-2 text-xs text-bone-100 focus:border-blood-500 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <FieldError>{errors[`openingHours.${index}.closesAt`]}</FieldError>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Barra de ação fixa no rodapé — o formulário é longo. */}
      <div className="sticky bottom-0 -mx-4 border-t border-hairline bg-ink-950/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex justify-end">
          <Button type="submit" isLoading={pending}>
            Salvar configurações
            <Save aria-hidden="true" />
          </Button>
        </div>
      </div>
    </form>
  );
}
