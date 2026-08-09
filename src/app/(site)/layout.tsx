import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { GrainOverlay } from "@/components/site/grain";
import { StudioJsonLd } from "@/components/site/json-ld";

/**
 * Layout público.
 *
 * O grão fica no layout (e não em cada seção) para ser um único elemento fixo
 * sobre toda a página, sem custo de repaint ao rolar.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <StudioJsonLd />
      <GrainOverlay />

      {/* Pular para o conteúdo: primeiro alvo do Tab em qualquer página. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-blood-500 focus:px-4 focus:py-3 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-bone-100"
      >
        Pular para o conteúdo
      </a>

      <Navbar />

      <main id="conteudo" className="min-h-dvh">
        {children}
      </main>

      <Footer />
    </>
  );
}
