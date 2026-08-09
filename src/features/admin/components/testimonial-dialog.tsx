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
import { deleteTestimonial, saveTestimonial } from "@/features/admin/actions";

export type TestimonialFormData = {
  id: string;
  clientName: string;
  avatarUrl: string;
  rating: string;
  content: string;
  serviceName: string;
  artistId: string;
  isPublished: boolean;
  displayOrder: string;
};

const EMPTY: TestimonialFormData = {
  id: "",
  clientName: "",
  avatarUrl: "",
  rating: "5",
  content: "",
  serviceName: "",
  artistId: "",
  isPublished: true,
  displayOrder: "0",
};

export function TestimonialDialog({
  mode,
  testimonial,
  artists,
}: {
  mode: "create" | "edit";
  testimonial?: TestimonialFormData;
  artists: { id: string; name: string }[];
}) {
  const [form, setForm] = React.useState<TestimonialFormData>(testimonial ?? EMPTY);

  // Reflete uma edição vinda do servidor (após router.refresh) sem efeito:
  // ajuste de estado durante a renderização é o padrão recomendado pelo React
  // para derivar estado de props e evita a renderização em cascata.
  const [source, setSource] = React.useState(testimonial);
  if (testimonial !== source) {
    setSource(testimonial);
    setForm(testimonial ?? EMPTY);
  }

  const patch = (values: Partial<TestimonialFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  return (
    <CrudDialog
      mode={mode}
      title={mode === "create" ? "Novo depoimento" : "Editar depoimento"}
      description="Publique apenas com autorização do cliente. Use o primeiro nome e a inicial do sobrenome."
      triggerLabel="Novo depoimento"
      buildValues={() => ({
        ...(form.id ? { id: form.id } : {}),
        clientName: form.clientName,
        avatarUrl: form.avatarUrl,
        rating: form.rating,
        content: form.content,
        serviceName: form.serviceName,
        artistId: form.artistId,
        isPublished: form.isPublished,
        displayOrder: form.displayOrder,
      })}
      onSave={saveTestimonial}
      onDelete={
        mode === "edit" && form.id ? () => deleteTestimonial(form.id) : undefined
      }
    >
      {({ errors, disabled }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field>
              <Label htmlFor="tst-name" required>
                Nome do cliente
              </Label>
              <Input
                id="tst-name"
                value={form.clientName}
                onChange={(event) => patch({ clientName: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.clientName)}
                placeholder="Rafael S."
              />
              <FieldError>{errors.clientName}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="tst-rating" required>
                Nota
              </Label>
              <NativeSelect
                id="tst-rating"
                value={form.rating}
                onChange={(event) => patch({ rating: event.target.value })}
                disabled={disabled}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "estrela" : "estrelas"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field>
            <Label htmlFor="tst-content" required>
              Depoimento
            </Label>
            <Textarea
              id="tst-content"
              value={form.content}
              onChange={(event) => patch({ content: event.target.value })}
              disabled={disabled}
              maxLength={1000}
              className="min-h-28"
              aria-invalid={Boolean(errors.content)}
            />
            <FieldHint>{form.content.length}/1000 caracteres</FieldHint>
            <FieldError>{errors.content}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="tst-service">Serviço</Label>
              <Input
                id="tst-service"
                value={form.serviceName}
                onChange={(event) => patch({ serviceName: event.target.value })}
                disabled={disabled}
                placeholder="Tatuagem personalizada"
              />
            </Field>

            <Field>
              <Label htmlFor="tst-artist">Artista</Label>
              <NativeSelect
                id="tst-artist"
                value={form.artistId}
                onChange={(event) => patch({ artistId: event.target.value })}
                disabled={disabled}
              >
                <option value="">Não informar</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <ImageUploadField
              label="Avatar"
              aspect="square"
              folder="testimonials"
              value={form.avatarUrl}
              onChange={(path) => patch({ avatarUrl: path })}
              disabled={disabled}
              hint="Opcional — sem foto, mostramos as iniciais."
            />

            <Field>
              <Label htmlFor="tst-order">Ordem</Label>
              <Input
                id="tst-order"
                type="number"
                min={0}
                max={999}
                value={form.displayOrder}
                onChange={(event) => patch({ displayOrder: event.target.value })}
                disabled={disabled}
              />
            </Field>
          </div>

          <div className="border-t border-hairline pt-5">
            <Switch
              checked={form.isPublished}
              onCheckedChange={(checked) => patch({ isPublished: checked })}
              disabled={disabled}
              label="Publicado"
              hint="Rascunhos ficam salvos mas não aparecem na home."
            />
          </div>
        </>
      )}
    </CrudDialog>
  );
}
