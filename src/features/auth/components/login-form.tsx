"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/field";
import { login, type LoginState } from "@/features/auth/actions";

/**
 * Formulário de login.
 *
 * Usa Server Action com `useActionState`: sem endpoint de API, sem token CSRF
 * manual (o Next valida a origem das Server Actions) e o formulário funciona
 * mesmo antes do JavaScript hidratar.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const destino = searchParams.get("destino") ?? "";

  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="destino" value={destino} />

      <Field>
        <Label htmlFor="email" required>
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          // Repopula depois de uma tentativa falha: o React 19 limpa os campos
          // do formulário quando a action termina.
          defaultValue={state.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          placeholder="voce@inkhouse.studio"
        />
        <FieldError id="email-error">{state.fieldErrors?.email}</FieldError>
      </Field>

      <Field>
        <Label htmlFor="password" required>
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          placeholder="••••••••"
        />
        <FieldError id="password-error">{state.fieldErrors?.password}</FieldError>
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

/** Componente separado para ler o estado pendente do formulário-pai. */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" block size="lg" isLoading={pending} loadingText="Entrando">
      Entrar
      <LogIn aria-hidden="true" />
    </Button>
  );
}
