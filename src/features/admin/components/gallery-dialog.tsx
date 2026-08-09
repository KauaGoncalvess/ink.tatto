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
import { deleteGalleryItem, saveGalleryItem } from "@/features/admin/actions";

export type GalleryFormData = {
  id: string;
  title: string;
  style: string;
  imageUrl: string;
  alt: string;
  description: string;
  bodyPart: string;
  artistId: string;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: string;
};

const EMPTY: GalleryFormData = {
  id: "",
  title: "",
  style: "",
  imageUrl: "",
  alt: "",
  description: "",
  bodyPart: "",
  artistId: "",
  isPublished: true,
  isFeatured: false,
  displayOrder: "0",
};

const STYLE_SUGGESTIONS = [
  "Realismo",
  "Blackwork",
  "Fine Line",
  "Old School",
  "Neo Traditional",
  "Oriental",
];

export function GalleryDialog({
  mode,
  item,
  artists,
}: {
  mode: "create" | "edit";
  item?: GalleryFormData;
  artists: { id: string; name: string }[];
}) {
  const [form, setForm] = React.useState<GalleryFormData>(item ?? EMPTY);

  // Reflete uma edição vinda do servidor (após router.refresh) sem efeito:
  // ajuste de estado durante a renderização é o padrão recomendado pelo React
  // para derivar estado de props e evita a renderização em cascata.
  const [source, setSource] = React.useState(item);
  if (item !== source) {
    setSource(item);
    setForm(item ?? EMPTY);
  }

  const patch = (values: Partial<GalleryFormData>) =>
    setForm((current) => ({ ...current, ...values }));

  return (
    <CrudDialog
      mode={mode}
      title={mode === "create" ? "Novo trabalho" : "Editar trabalho"}
      description="Suba o arquivo em /public/images/gallery e informe o caminho abaixo."
      triggerLabel="Novo trabalho"
      buildValues={() => ({
        ...(form.id ? { id: form.id } : {}),
        title: form.title,
        style: form.style,
        imageUrl: form.imageUrl,
        alt: form.alt,
        description: form.description,
        bodyPart: form.bodyPart,
        artistId: form.artistId,
        isPublished: form.isPublished,
        isFeatured: form.isFeatured,
        displayOrder: form.displayOrder,
      })}
      onSave={saveGalleryItem}
      onDelete={mode === "edit" && form.id ? () => deleteGalleryItem(form.id) : undefined}
    >
      {({ errors, disabled }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="gal-title" required>
                Título
              </Label>
              <Input
                id="gal-title"
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.title)}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="gal-style" required>
                Estilo
              </Label>
              <Input
                id="gal-style"
                list="gallery-styles"
                value={form.style}
                onChange={(event) => patch({ style: event.target.value })}
                disabled={disabled}
                aria-invalid={Boolean(errors.style)}
              />
              <datalist id="gallery-styles">
                {STYLE_SUGGESTIONS.map((style) => (
                  <option key={style} value={style} />
                ))}
              </datalist>
              <FieldError>{errors.style}</FieldError>
            </Field>
          </div>

          <Field>
            <Label htmlFor="gal-image" required>
              Caminho da imagem
            </Label>
            <Input
              id="gal-image"
              value={form.imageUrl}
              onChange={(event) => patch({ imageUrl: event.target.value })}
              disabled={disabled}
              placeholder="/images/gallery/work-01.jpg"
              aria-invalid={Boolean(errors.imageUrl)}
            />
            <FieldError>{errors.imageUrl}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="gal-alt" required>
              Texto alternativo
            </Label>
            <Input
              id="gal-alt"
              value={form.alt}
              onChange={(event) => patch({ alt: event.target.value })}
              disabled={disabled}
              maxLength={200}
              aria-invalid={Boolean(errors.alt)}
              placeholder="Tatuagem realista de um leão em preto e cinza no braço"
            />
            <FieldHint>
              Descreva o que aparece na foto. É o que o leitor de tela anuncia.
            </FieldHint>
            <FieldError>{errors.alt}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="gal-description">Descrição</Label>
            <Textarea
              id="gal-description"
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              disabled={disabled}
              maxLength={500}
              className="min-h-20"
              placeholder="Contexto do trabalho, exibido no lightbox."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <Label htmlFor="gal-artist">Artista</Label>
              <NativeSelect
                id="gal-artist"
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

            <Field>
              <Label htmlFor="gal-body">Local do corpo</Label>
              <Input
                id="gal-body"
                value={form.bodyPart}
                onChange={(event) => patch({ bodyPart: event.target.value })}
                disabled={disabled}
                placeholder="Antebraço"
              />
            </Field>

            <Field>
              <Label htmlFor="gal-order">Ordem</Label>
              <Input
                id="gal-order"
                type="number"
                min={0}
                max={999}
                value={form.displayOrder}
                onChange={(event) => patch({ displayOrder: event.target.value })}
                disabled={disabled}
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-hairline pt-5">
            <Switch
              checked={form.isPublished}
              onCheckedChange={(checked) => patch({ isPublished: checked })}
              disabled={disabled}
              label="Publicado"
              hint="Rascunhos ficam salvos mas não aparecem no site."
            />
            <Switch
              checked={form.isFeatured}
              onCheckedChange={(checked) => patch({ isFeatured: checked })}
              disabled={disabled}
              label="Destaque"
              hint="Prioriza este trabalho na vitrine da home."
            />
          </div>
        </>
      )}
    </CrudDialog>
  );
}
