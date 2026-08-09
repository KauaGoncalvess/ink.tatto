"use client";

import * as React from "react";

import { CrudDialog } from "@/features/admin/components/crud-dialog";
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
import { ImageUploadField } from "@/components/ui/image-upload";
import { ServiceIcon } from "@/components/site/service-icon";
import { deleteService, saveService } from "@/features/admin/actions";

export type ServiceFormData = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  icon: string;
  imageUrl: string;
  durationMin: string;
  bufferMin: string;
  priceFrom: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: string;
};

const EMPTY: ServiceFormData = {
  id: "",
  name: "",
  shortDescription: "",
  description: "",
  icon: "Sparkles",
  imageUrl: "",
  durationMin: "60",
  bufferMin: "15",
  priceFrom: "0",
  isActive: true,
  isFeatured: false,
  displayOrder: "0",
};

/** Ícones disponíveis — os mesmos mapeados em service-icon.tsx. */
const ICON_OPTIONS = [
  "PenTool",
  "Layers",
  "RefreshCw",
  "Minus",
  "Frame",
  "Circle",
  "MessagesSquare",
  "HeartPulse",
  "Sparkles",
];

export function ServiceDialog({
  mode,
  service,
}: {
  mode: "create" | "edit";
  service?: ServiceFormData;
}) {
  const [form, setForm] = React.useState<ServiceFormData>(service ?? EMPTY);

  // Reflete uma edição vinda do servidor (após router.refresh) sem efeito:
  // ajuste de estado durante a renderização é o padrão recomendado pelo React
  // para derivar estado de props e evita a renderização em cascata.
  const [source, setSource] = React.useState(service);
  if (service !== source) {
    setSource(service);
    setForm(service ?? EMPTY);
  }

  const patch = (values: Partial<ServiceFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  return (
    <CrudDialog
      mode={mode}
      size="lg"
      title={mode === "create" ? "Novo serviço" : "Editar serviço"}
      description="A duração somada ao buffer é o tempo que a sessão ocupa na agenda do artista."
      triggerLabel="Novo serviço"
      buildValues={() => ({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        icon: form.icon,
        imageUrl: form.imageUrl,
        durationMin: form.durationMin,
        bufferMin: form.bufferMin,
        priceFrom: form.priceFrom,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        displayOrder: form.displayOrder,
      })}
      onSave={saveService}
      onDelete={mode === "edit" && form.id ? () => deleteService(form.id) : undefined}
    >
      {({ errors, disabled }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <Field>
              <Label htmlFor="svc-name" required>
                Nome
              </Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="svc-icon">Ícone</Label>
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center border border-hairline text-blood-500">
                  <ServiceIcon name={form.icon} className="size-5" />
                </span>
                <NativeSelect
                  id="svc-icon"
                  value={form.icon}
                  onChange={(event) => patch({ icon: event.target.value })}
                  disabled={disabled}
                  className="w-44"
                >
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </Field>
          </div>

          <Field>
            <Label htmlFor="svc-short" required>
              Frase curta
            </Label>
            <Input
              id="svc-short"
              value={form.shortDescription}
              onChange={(event) => patch({ shortDescription: event.target.value })}
              disabled={disabled}
              maxLength={200}
              aria-invalid={Boolean(errors.shortDescription)}
              placeholder="Aparece no card da home e na lista de serviços."
            />
            <FieldError>{errors.shortDescription}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="svc-description" required>
              Descrição completa
            </Label>
            <Textarea
              id="svc-description"
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              disabled={disabled}
              maxLength={3000}
              className="min-h-32"
              aria-invalid={Boolean(errors.description)}
            />
            <FieldError>{errors.description}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <Label htmlFor="svc-duration" required>
                Duração (min)
              </Label>
              <Input
                id="svc-duration"
                type="number"
                min={15}
                max={600}
                step={5}
                value={form.durationMin}
                onChange={(event) => patch({ durationMin: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.durationMin)}
              />
              <FieldError>{errors.durationMin}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="svc-buffer">Buffer (min)</Label>
              <Input
                id="svc-buffer"
                type="number"
                min={0}
                max={120}
                step={5}
                value={form.bufferMin}
                onChange={(event) => patch({ bufferMin: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.bufferMin)}
              />
              <FieldHint>Limpeza e preparo entre sessões.</FieldHint>
            </Field>

            <Field>
              <Label htmlFor="svc-price" required>
                Preço inicial (R$)
              </Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={form.priceFrom}
                onChange={(event) => patch({ priceFrom: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.priceFrom)}
              />
              <FieldHint>Use 0 para serviços gratuitos.</FieldHint>
              <FieldError>{errors.priceFrom}</FieldError>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ImageUploadField
              label="Imagem do serviço"
              aspect="wide"
              folder="services"
              value={form.imageUrl}
              onChange={(path) => patch({ imageUrl: path })}
              disabled={disabled}
              hint="Aparece atrás do card, em opacidade baixa."
            />

            <Field>
              <Label htmlFor="svc-order">Ordem de exibição</Label>
              <Input
                id="svc-order"
                type="number"
                min={0}
                max={999}
                value={form.displayOrder}
                onChange={(event) => patch({ displayOrder: event.target.value })}
                disabled={disabled}
              />
              <FieldHint>Menor número aparece primeiro.</FieldHint>
            </Field>
          </div>

          <div className="space-y-4 border-t border-hairline pt-5">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => patch({ isActive: checked })}
              disabled={disabled}
              label="Serviço ativo"
              hint="Serviços inativos somem do site e não podem ser agendados."
            />
            <Switch
              checked={form.isFeatured}
              onCheckedChange={(checked) => patch({ isFeatured: checked })}
              disabled={disabled}
              label="Destacar na home"
              hint="Aparece na seção de serviços da página inicial."
            />
          </div>
        </>
      )}
    </CrudDialog>
  );
}
