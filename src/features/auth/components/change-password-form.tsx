"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import { changePassword } from "@/features/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/schemas/account";

/**
 * Troca de senha da própria conta.
 *
 * Os três campos são `type="password"` com `autoComplete` correto para o
 * gerenciador de senhas do navegador entender o que está acontecendo — é o que
 * faz ele oferecer gerar uma senha forte e salvar a nova depois.
 */
export function ChangePasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      const result = await changePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
      });

      if (result.ok) {
        toast.success(result.message);
        formRef.current?.reset();
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

  return (
    <Panel>
      <PanelHeader
        title="Trocar senha"
        description="Pedimos a senha atual para garantir que é você — inclusive se a sessão tiver ficado aberta em algum aparelho."
      />

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
        <Field>
          <Label htmlFor="currentPassword" required>
            Senha atual
          </Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            disabled={pending}
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={errors.currentPassword ? "err-current" : undefined}
          />
          <FieldError id="err-current">{errors.currentPassword}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="newPassword" required>
            Nova senha
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            disabled={pending}
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? "err-new" : "hint-new"}
          />
          <FieldHint id="hint-new">
            Pelo menos {MIN_PASSWORD_LENGTH} caracteres. Comprimento protege mais
            que símbolos: uma frase que só você usa vale mais que
            &ldquo;S3nh@!&rdquo;.
          </FieldHint>
          <FieldError id="err-new">{errors.newPassword}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="confirmPassword" required>
            Repita a nova senha
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            disabled={pending}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "err-confirm" : undefined}
          />
          <FieldError id="err-confirm">{errors.confirmPassword}</FieldError>
        </Field>

        {formError ? (
          <p
            role="alert"
            className="border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" isLoading={pending}>
            Trocar senha
            <KeyRound aria-hidden="true" />
          </Button>
        </div>
      </form>
    </Panel>
  );
}
