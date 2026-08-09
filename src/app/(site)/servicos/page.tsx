import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";

import { FinalCta } from "@/components/site/final-cta";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Section } from "@/components/site/section";
import { ServiceIcon } from "@/components/site/service-icon";
import { Button } from "@/components/ui/button";
import { getAllServices } from "@/features/content/queries";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Nossos serviços",
  description:
    "Tatuagem personalizada, cobertura, reforma, fine line, sessão de fechamento, piercing, consultoria e acompanhamento pós-tattoo. Veja duração e valores.",
  alternates: { canonical: "/servicos" },
};

export const revalidate = 300;

export default async function ServicesPage() {
  const services = await getAllServices();

  return (
    <>
      <PageHeader
        eyebrow="Nossos serviços"
        title="Arte. Técnica. Segurança."
        description="Do primeiro traço ao acompanhamento da cicatrização. Cada serviço tem duração e processo definidos — nada de orçamento surpresa."
      />

      <Section>
        <div className="container-editorial space-y-4">
          {services.map((service, index) => (
            <Reveal key={service.id} delay={(index % 3) * 80}>
              {/* Âncora com scroll-margin para o link vindo dos cards da home
                  não esconder o título sob a navbar fixa. */}
              <article
                id={service.slug}
                className="surface group grid scroll-mt-28 gap-0 overflow-hidden lg:grid-cols-12"
              >
                {/* Fotografia — alterna o lado a cada item, criando ritmo. */}
                <div
                  className={cn(
                    "relative aspect-16/9 lg:col-span-5 lg:aspect-auto lg:min-h-72",
                    index % 2 === 1 && "lg:order-last",
                  )}
                >
                  <Image
                    src={service.imageUrl ?? FALLBACK_IMAGE}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover opacity-60 transition-[opacity,transform] duration-700 group-hover:scale-105 group-hover:opacity-80"
                  />
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t from-ink-900 to-transparent",
                      index % 2 === 1
                        ? "lg:bg-gradient-to-l lg:from-ink-900 lg:to-transparent"
                        : "lg:bg-gradient-to-r lg:from-transparent lg:to-ink-900",
                    )}
                  />
                </div>

                <div className="lg:col-span-7">
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="flex items-start gap-4">
                      <span className="inline-grid size-11 shrink-0 place-items-center border border-hairline text-blood-500">
                        <ServiceIcon name={service.icon} className="size-4" />
                      </span>

                      <div className="min-w-0">
                        <h2 className="font-display text-2xl uppercase tracking-tight text-bone-100 sm:text-3xl">
                          {service.name}
                        </h2>
                        <p className="mt-1 text-sm text-ash-500">
                          {service.shortDescription}
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 text-sm leading-relaxed text-ash-300">
                      {service.description}
                    </p>

                    {/* Artistas que executam */}
                    {service.artists.length > 0 ? (
                      <div className="mt-6">
                        <h3 className="overline text-ash-600">Quem faz</h3>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {service.artists.map((link) => (
                            <li key={link.artist.id}>
                              <Link
                                href={`/artistas/${link.artist.slug}`}
                                className="inline-block border border-hairline px-3 py-1.5 text-xs text-bone-200 transition-colors hover:border-blood-500 hover:text-blood-400"
                              >
                                {link.artist.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-hairline pt-6">
                      <dl className="flex gap-8">
                        <div>
                          <dt className="overline text-ash-600">Duração</dt>
                          <dd className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-bone-100">
                            <Clock className="size-3.5 text-blood-500" aria-hidden="true" />
                            {formatDuration(service.durationMin)}
                          </dd>
                        </div>
                        <div>
                          <dt className="overline text-ash-600">
                            {service.priceFrom > 0 ? "A partir de" : "Valor"}
                          </dt>
                          <dd className="mt-1.5 text-sm font-semibold text-bone-100">
                            {service.priceFrom > 0
                              ? formatCurrency(service.priceFrom)
                              : "Sem custo"}
                          </dd>
                        </div>
                      </dl>

                      <Button asChild size="sm">
                        <Link href={`/agendamento?servico=${service.id}`}>
                          Agendar
                          <CalendarDays aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
