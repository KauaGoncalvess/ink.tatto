import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/site/brand";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Entrar no painel",
  // O painel nunca deve aparecer em buscador.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 px-5 py-16">
      {/* Brilho de fundo, o mesmo motivo do hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(200,16,46,0.08),transparent_55%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo size="md" asLink={false} />
        </div>

        <div className="surface-raised p-7 sm:p-8">
          <h1 className="font-display text-2xl uppercase tracking-tight text-bone-100">
            Área administrativa
          </h1>
          <p className="mt-2 text-sm text-ash-500">
            Entre com suas credenciais para gerenciar o estúdio.
          </p>

          <div className="mt-8">
            {/* useSearchParams (destino do redirect) exige Suspense. */}
            <Suspense fallback={<div className="skeleton h-64" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-ash-500 transition-colors hover:text-bone-200"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Voltar ao site
          </Link>
        </div>
      </div>
    </main>
  );
}
