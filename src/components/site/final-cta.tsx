import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { BLUR_DATA_URL, heroImages } from "@/config/images";
import { whatsappLink } from "@/config/site";

/**
 * CTA de fechamento.
 *
 * Fotografia sangrando na largura toda com scrim pesado — o momento mais
 * gráfico da página, logo antes do rodapé, para capturar quem rolou até o fim.
 */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-final"
      className="relative isolate overflow-hidden"
    >
      <Image
        src={heroImages.ctaBackground.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="-z-10 object-cover"
      />

      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0 bg-ink-950/80"
      />
      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,8,10,0.9)_75%)]"
      />

      <div className="container-editorial py-24 text-center md:py-32 lg:py-40">
        <Reveal>
          <span
            aria-hidden="true"
            className="mx-auto mb-8 block h-0.5 w-16 bg-blood-500"
          />

          <h2
            id="cta-final"
            className="display-title mx-auto max-w-4xl text-[clamp(2.25rem,7vw,5.5rem)]"
          >
            Pronto para marcar
            <br />
            sua história na pele?
          </h2>

          <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-ash-300">
            Conte sua ideia para a gente. A primeira conversa não custa nada e
            já é parte do projeto.
          </p>

          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/agendamento">
                Agendar agora
                <CalendarDays aria-hidden="true" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
                <MessageCircle aria-hidden="true" />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
