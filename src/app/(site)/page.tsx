import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Syringe } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { FinalCta } from "@/components/site/final-cta";
import { Gallery } from "@/components/site/gallery";
import { ArtistCard } from "@/components/site/artist-card";
import { ServiceCard } from "@/components/site/service-card";
import { TestimonialCard } from "@/components/site/testimonial-card";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeader } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickBooking } from "@/features/booking/components/quick-booking";
import {
  getActiveArtists,
  getFeaturedServices,
  getGalleryItems,
  getTestimonials,
} from "@/features/content/queries";
import {
  getBookableArtists,
  getBookableServices,
  getStudioRules,
} from "@/features/booking/queries";
import { BLUR_DATA_URL, studioImages } from "@/config/images";

/**
 * Home.
 *
 * Server Component: todas as consultas rodam no servidor e o HTML já chega
 * pronto. Só o bloco de agendamento rápido e a galeria (lightbox) são ilhas de
 * cliente.
 *
 * A ordem das seções conta uma história: quem somos → o que fazemos → prova
 * (trabalhos) → quem faz → confiança (depoimentos) → agendar. O CTA de agendar
 * aparece quatro vezes ao longo do caminho.
 */

// Conteúdo vem do banco e muda pelo admin; revalidação curta mantém a home
// rápida sem servir dados velhos por muito tempo.
export const revalidate = 60;

export default async function HomePage() {
  const [
    services,
    artists,
    gallery,
    testimonials,
    bookableArtists,
    bookableServices,
    rules,
  ] = await Promise.all([
    getFeaturedServices(4),
    getActiveArtists(3),
    getGalleryItems({ limit: 10 }),
    getTestimonials(3),
    getBookableArtists(),
    getBookableServices(),
    getStudioRules(),
  ]);

  return (
    <>
      <Hero />

      {/* Agendamento rápido — sobreposto ao limite do hero. */}
      <div className="container-editorial relative z-10 -mt-4 md:-mt-8">
        <QuickBooking
          artists={bookableArtists.map((artist) => ({
            id: artist.id,
            name: artist.name,
            handle: artist.handle,
            serviceIds: artist.services.map((link) => link.serviceId),
          }))}
          services={bookableServices.map((service) => ({
            id: service.id,
            name: service.name,
            durationMin: service.durationMin,
          }))}
          minLeadTimeHours={rules.minLeadTimeHours}
          maxAdvanceDays={rules.maxAdvanceDays}
        />
      </div>

      <AboutSection />

      {/* Serviços */}
      <Section id="servicos" className="border-t border-hairline bg-ink-900/40">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Nossos serviços"
            title="Arte. Técnica. Segurança."
            description="Do primeiro traço ao acompanhamento da cicatrização, cada etapa tem um processo definido."
            align="center"
          />

          <ul
            className={cn(
              "mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:mt-14",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4",
            )}
          >
            {services.map((service, index) => (
              <Reveal
                as="li"
                key={service.id}
                delay={index * 90}
                className="w-[78vw] min-w-0 shrink-0 snap-start sm:w-auto"
              >
                <ServiceCard service={service} className="h-full" />
              </Reveal>
            ))}
          </ul>

          <Reveal className="mt-8 flex justify-center md:mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/servicos">
                Ver todos os serviços
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </Section>

      {/* Galeria */}
      <Section id="galeria" className="border-t border-hairline">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Nossa arte"
            title="Alguns trabalhos"
            description="Peças autorais feitas no estúdio, do realismo ao fine line."
            align="center"
          />

          <Reveal className="mt-14">
            <Gallery items={gallery} layout="carousel" />
          </Reveal>

          <Reveal className="mt-8 flex justify-center md:mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/galeria">
                Ver galeria completa
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </Section>

      {/* Artistas */}
      <Section id="artistas" className="border-t border-hairline bg-ink-900/40">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Nossos artistas"
            title="Quem vai tatuar você"
            description="Cada artista tem um repertório próprio. Escolha quem combina com a sua ideia."
            action={
              <Button asChild variant="outline">
                <Link href="/artistas">
                  Conhecer todos
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <ul className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10">
            {artists.map((artist, index) => (
              <Reveal as="li" key={artist.id} delay={index * 110} className="min-w-0">
                {/* Duas renderizações do mesmo card em vez de um layout que
                    se contorce: no celular a versão horizontal, da tablet
                    para cima o retrato. */}
                <ArtistCard artist={artist} variant="compact" className="sm:hidden" />
                <ArtistCard
                  artist={artist}
                  className="hidden h-full sm:flex"
                  headingAs="h3"
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Depoimentos */}
      <Section className="border-t border-hairline">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Depoimentos"
            title="O que nossos clientes dizem"
            align="center"
          />

          {/* Diferente dos outros carrosséis, um depoimento não tem link nem
              botão dentro. Sem conteúdo focável, a faixa rolava só com o dedo
              ou com o mouse — quem navega por teclado não alcançava do segundo
              depoimento em diante. `tabIndex` devolve a rolagem por setas. */}
          <ul
            tabIndex={0}
            aria-label="Depoimentos de clientes"
            className={cn(
              "mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:mt-14",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blood-500",
              "md:grid md:grid-cols-3 md:overflow-visible md:pb-0",
            )}
          >
            {testimonials.map((testimonial, index) => (
              <Reveal
                as="li"
                key={testimonial.id}
                delay={index * 110}
                className="w-[80vw] min-w-0 shrink-0 snap-start md:w-auto"
              >
                <TestimonialCard testimonial={testimonial} />
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

/** Seção editorial sobre o estúdio: texto à esquerda, fotografia à direita. */
function AboutSection() {
  const pillars = [
    {
      Icon: Sparkles,
      title: "Projeto autoral",
      text: "Nenhum desenho é reaproveitado. Cada peça nasce da sua história.",
    },
    {
      Icon: ShieldCheck,
      title: "Biossegurança",
      text: "Material descartável, aberto na sua frente, e protocolo de esterilização documentado.",
    },
    {
      Icon: Syringe,
      title: "Acompanhamento",
      text: "Orientação de cicatrização por escrito e retoque gratuito em 90 dias.",
    },
  ];

  return (
    <Section id="sobre" spacing="lg">
      <div className="container-editorial">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <SectionHeader
              eyebrow="Sobre o estúdio"
              title={
                <>
                  Mais que tatuagens,
                  <br />
                  criamos conexões.
                </>
              }
              description="Aqui cada traço carrega significado. Somos referência em tatuagem autoral, com artistas experientes e um ambiente pensado para você se sentir seguro e inspirado do primeiro contato ao último retoque."
            />

            <ul className="mt-10 space-y-6">
              {pillars.map((pillar, index) => (
                <Reveal as="li" key={pillar.title} delay={index * 90}>
                  <div className="flex gap-4">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center border border-hairline text-blood-500">
                      <pillar.Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-bone-100">
                        {pillar.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ash-400">
                        {pillar.text}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={280} className="mt-10">
              <Button asChild variant="outline" size="lg">
                <Link href="/sobre">
                  Conheça nosso estúdio
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </Reveal>
          </div>

          {/* Composição de duas fotografias sobrepostas. */}
          <Reveal variant="fade" className="lg:col-span-6">
            <div className="relative">
              <div className="relative aspect-4/3 w-full sm:aspect-3/2 lg:aspect-4/5">
                <Image
                  src={studioImages.interior.src}
                  alt={studioImages.interior.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover"
                />
              </div>

              <div className="absolute -bottom-8 -left-4 hidden aspect-square w-40 border-4 border-ink-950 lg:block xl:w-52">
                <Image
                  src={studioImages.detail.src}
                  alt={studioImages.detail.alt}
                  fill
                  sizes="208px"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
