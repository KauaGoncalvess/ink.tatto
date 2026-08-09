"use client";

import * as React from "react";
import Link from "next/link";
import { Home, MessageCircle, RotateCcw } from "lucide-react";

import { StatusScreen } from "@/components/site/status-screen";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/config/site";

/**
 * Erro em qualquer rota pública.
 *
 * O `digest` é o identificador que o Next grava no log do servidor. Mostrá-lo
 * ao visitante é o que permite localizar a ocorrência quando ele relata o
 * problema — a mensagem real do erro nunca é exposta, porque pode conter
 * detalhes de infraestrutura.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[site] erro não tratado", error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow="Algo saiu errado"
      title="Falhou na hora de carregar."
      description="Tivemos um problema inesperado ao montar esta página. Tente de novo — se continuar, fale com o estúdio pelo WhatsApp que a gente resolve na hora."
      note={error.digest ? `Código: ${error.digest}` : undefined}
      actions={
        <>
          <Button size="lg" onClick={reset}>
            Tentar novamente
            <RotateCcw aria-hidden="true" />
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">
              Voltar ao início
              <Home aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              WhatsApp
              <MessageCircle aria-hidden="true" />
            </a>
          </Button>
        </>
      }
    />
  );
}
