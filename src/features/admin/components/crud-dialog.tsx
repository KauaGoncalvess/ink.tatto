"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
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
import type { CrudResult } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

/**
 * Casca compartilhada dos formulários de CRUD.
 *
 * Concentra o que todo formulário do painel repete: abrir/fechar o diálogo,
 * estado de envio, tratamento de erro por campo, toast e refresh. Cada
 * entidade só escreve os próprios campos, via render prop.
 */

export type CrudFormProps = {
  errors: Record<string, string>;
  disabled: boolean;
};

export function CrudDialog<T>({
  mode,
  title,
  description,
  triggerLabel,
  buildValues,
  onSave,
  onDelete,
  deleteLabel = "Excluir",
  children,
  size = "md",
}: {
  mode: "create" | "edit";
  title: string;
  description?: string;
  /** Rótulo do gatilho no modo "create"; no modo "edit" é sempre o ícone. */
  triggerLabel?: string;
  /** Coleta os valores atuais do formulário no momento do envio. */
  buildValues: () => T;
  onSave: (values: T) => Promise<CrudResult>;
  onDelete?: () => Promise<CrudResult>;
  deleteLabel?: string;
  children: (props: CrudFormProps) => React.ReactNode;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus aria-hidden="true" />
            {triggerLabel ?? "Novo"}
          </Button>
        ) : (
          <button
            type="button"
            className="grid size-9 place-items-center border border-hairline text-ash-400 transition-colors hover:border-hairline-strong hover:bg-ink-800 hover:text-bone-100"
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">Editar {title.toLowerCase()}</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className={cn(size === "lg" && "max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {/*
          O corpo do formulário vive num componente próprio, montado apenas
          enquanto o diálogo está aberto (o Radix desmonta o conteúdo ao
          fechar). Assim os erros e o estado de exclusão nascem limpos a cada
          abertura, sem precisar de um efeito para resetá-los.
        */}
        <CrudDialogBody
          mode={mode}
          buildValues={buildValues}
          onSave={onSave}
          onDelete={onDelete}
          deleteLabel={deleteLabel}
          onClose={() => setOpen(false)}
        >
          {children}
        </CrudDialogBody>
      </DialogContent>
    </Dialog>
  );
}

function CrudDialogBody<T>({
  mode,
  buildValues,
  onSave,
  onDelete,
  deleteLabel,
  onClose,
  children,
}: {
  mode: "create" | "edit";
  buildValues: () => T;
  onSave: (values: T) => Promise<CrudResult>;
  onDelete?: () => Promise<CrudResult>;
  deleteLabel: string;
  onClose: () => void;
  children: (props: CrudFormProps) => React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const result = await onSave(buildValues());

      if (result.ok) {
        toast.success(result.message ?? "Salvo com sucesso.");
        onClose();
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

  async function handleDelete() {
    if (!onDelete) return;
    setPending(true);
    setFormError(null);

    try {
      const result = await onDelete();
      if (result.ok) {
        toast.success(result.message ?? "Excluído.");
        onClose();
        router.refresh();
      } else {
        setFormError(result.error);
        setConfirmDelete(false);
      }
    } catch {
      setFormError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {children({ errors, disabled: pending })}

      {formError ? (
        <p
          role="alert"
          className="border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
        >
          {formError}
        </p>
      ) : null}

      <DialogFooter className="sm:justify-between">
        {onDelete && mode === "edit" ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={pending}
                onClick={handleDelete}
              >
                Confirmar exclusão
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Voltar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="text-blood-400 hover:text-blood-300"
            >
              <Trash2 aria-hidden="true" />
              {deleteLabel}
            </Button>
          )
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={pending}>
            Salvar
            <Save aria-hidden="true" />
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
