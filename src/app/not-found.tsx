import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Home } from "lucide-react";

import { Footer } from "@/components/site/footer";
import { GrainOverlay } from "@/components/site/grain";
import { Navbar } from "@/components/site/navbar";
import { StatusScreen } from "@/components/site/status-screen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

/**
 * 404 global.
 *
 * Fica na raiz do app (e não dentro de `(site)`) porque o Next usa este
 * arquivo para qualquer rota inexistente, inclusive fora dos grupos. Por isso
 * a navbar e o rodapé são montados aqui explicitamente.
 */
export default function NotFound() {
  return (
    <>
      <GrainOverlay />
      <Navbar />

      <main>
        <StatusScreen
          code="404"
          eyebrow="Página não encontrada"
          title="Este traço não existe."
          description="O endereço que você tentou acessar não está mais aqui — ou nunca esteve. Volte para o início ou vá direto para o agendamento."
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/">
                  Voltar ao início
                  <Home aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/agendamento">
                  Agendar horário
                  <CalendarDays aria-hidden="true" />
                </Link>
              </Button>
            </>
          }
        />
      </main>

      <Footer />
    </>
  );
}
