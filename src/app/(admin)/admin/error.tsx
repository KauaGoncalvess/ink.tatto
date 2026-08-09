"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Erro dentro do painel.
 *
 * Renderiza dentro da casca do admin (a sidebar continua funcionando), então
 * é um bloco de conteúdo e não uma tela cheia — o operador consegue navegar
 * para outra seção sem recarregar.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[admin] erro não tratado", error);
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="surface max-w-lg p-8 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center border border-blood-700 bg-blood-700/10 text-blood-400">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>

        <h1 className="mt-6 font-display text-2xl uppercase tracking-tight text-bone-100">
          Não foi possível carregar
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ash-400">
          Esta seção do painel falhou ao carregar. Tente novamente — se o
          problema persistir, verifique se o banco de dados está acessível.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>
            Tentar novamente
            <RotateCcw aria-hidden="true" />
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">
              Ir para o dashboard
              <LayoutDashboard aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-8 text-[0.625rem] uppercase tracking-[0.16em] text-ash-700">
            Código: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
