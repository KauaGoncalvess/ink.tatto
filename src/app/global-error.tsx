"use client";

import * as React from "react";

/**
 * Último recurso: erro no próprio layout raiz.
 *
 * Este componente substitui o `<html>` inteiro, então não pode depender de
 * nada que venha do layout — nem das fontes, nem do CSS global, nem de
 * componentes que usem tokens do tema. Por isso os estilos são inline: se o
 * CSS falhou em carregar, esta tela ainda precisa aparecer legível.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[global] erro fatal no layout raiz", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#08080a",
          color: "#ded9d3",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <div
            style={{
              width: "3rem",
              height: "2px",
              background: "#c8102e",
              margin: "0 auto 2rem",
            }}
          />

          <h1
            style={{
              fontSize: "clamp(1.75rem, 6vw, 2.75rem)",
              lineHeight: 1.1,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              color: "#f2f0ed",
              margin: 0,
            }}
          >
            Erro inesperado
          </h1>

          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.9375rem",
              lineHeight: 1.7,
              color: "#8a8a93",
            }}
          >
            A aplicação encontrou um problema do qual não conseguiu se
            recuperar. Recarregue a página; se persistir, entre em contato com o
            estúdio.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2.25rem",
              padding: "0.9rem 2rem",
              background: "#c8102e",
              color: "#f2f0ed",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>

          {error.digest ? (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.625rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#35353d",
              }}
            >
              Código: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
