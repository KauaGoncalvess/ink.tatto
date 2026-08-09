"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Field, FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Campo de imagem com upload.
 *
 * Aceita o arquivo por clique ou arrastar-e-soltar e devolve o caminho final
 * já gravado pelo servidor. Mantém também a entrada manual de caminho, porque
 * o estúdio pode querer apontar para uma imagem que já está versionada em
 * /public — o upload é a via cômoda, não a única.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  hint,
  error,
  disabled,
  required,
  /** Proporção da pré-visualização. */
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  /** Pasta de destino no servidor (ver UPLOAD_FOLDERS). */
  folder: "gallery" | "artists" | "services" | "testimonials" | "studio";
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  aspect?: "square" | "portrait" | "wide";
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [showManual, setShowManual] = React.useState(false);

  const fieldId = React.useId();

  async function upload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);

      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { path?: string; error?: string };

      if (!response.ok || !data.path) {
        setUploadError(data.error ?? "Não foi possível enviar a imagem.");
        return;
      }
      onChange(data.path);
    } catch {
      setUploadError("Falha no envio. Verifique sua conexão e tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass = {
    square: "aspect-square",
    portrait: "aspect-4/5",
    wide: "aspect-16/9",
  }[aspect];

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>

        <button
          type="button"
          onClick={() => setShowManual((current) => !current)}
          className="inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.14em] text-ash-500 transition-colors hover:text-bone-200"
        >
          <Link2 className="size-3" aria-hidden="true" />
          {showManual ? "Ocultar caminho" : "Informar caminho"}
        </button>
      </div>

      {value ? (
        /* Pré-visualização do que já está definido */
        <div className="flex items-start gap-4 border border-hairline bg-ink-850 p-3">
          <span
            className={cn(
              "relative w-24 shrink-0 overflow-hidden bg-ink-800",
              aspectClass,
            )}
          >
            <Image
              src={value}
              alt="Pré-visualização da imagem selecionada"
              fill
              sizes="96px"
              className="object-cover"
              // Imagem recém-enviada não passa pelo otimizador: o arquivo pode
              // ainda não estar no cache do servidor de imagens.
              unoptimized={value.startsWith("/uploads/")}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="break-all text-xs text-ash-400">{value}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="subtle"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Upload aria-hidden="true" />
                )}
                Trocar
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onChange("")}
              >
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Área de soltar / clicar */
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-sm transition-colors",
            dragging
              ? "border-blood-500 bg-blood-700/10 text-bone-100"
              : "border-hairline-strong bg-ink-850 text-ash-400 hover:border-blood-500 hover:text-bone-200",
            "disabled:opacity-60",
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
          <span>
            {uploading ? "Enviando…" : "Clique ou arraste uma imagem para cá"}
          </span>
          <span className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
            JPG, PNG ou WEBP · até 5 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          // Zera para permitir reenviar o mesmo arquivo depois de remover.
          event.target.value = "";
        }}
      />

      {showManual ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={`/images/${folder}/arquivo.jpg`}
          aria-label={`${label} — caminho manual`}
        />
      ) : null}

      <FieldHint>{hint}</FieldHint>
      <FieldError>{uploadError ?? error}</FieldError>
    </Field>
  );
}
