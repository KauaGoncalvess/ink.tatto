import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Sparkles } from "lucide-react";

import { Gallery } from "@/components/site/gallery";
import { FinalCta } from "@/components/site/final-cta";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeader } from "@/components/site/section";
import { ServiceIcon } from "@/components/site/service-icon";
import { InstagramIcon } from "@/components/site/social-icons";
import { Button } from "@/components/ui/button";
import { getArtistBySlug, getArtistSlugs } from "@/features/content/queries";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { WEEKDAY_LABELS } from "@/lib/datetime";
import { formatCurrency, formatDuration } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

/**
 * Pré-renderiza a página de cada artista no build.
 *
 * A falha é tolerada de propósito: em muitos pipelines (Docker, CI, deploy da
 * Vercel com banco em rede privada) o banco não está acessível durante o
 * build. Sem este catch, o build inteiro quebraria por causa de uma
 * otimização — devolvendo lista vazia, as páginas passam a ser renderizadas
 * sob demanda e o site continua correto.
 */
export async function generateStaticParams() {
  try {
    const slugs = await getArtistSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.warn(
      "[build] banco indisponível ao gerar rotas de artistas; elas serão renderizadas sob demanda.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    return { title: "Artista não encontrado" };
  }

  return {
    title: `${artist.name} — ${artist.specialties.join(", ")}`,
    description: artist.shortBio,
    alternates: { canonical: `/artistas/${artist.slug}` },
    openGraph: {
      title: `${artist.name} · Ink House`,
      description: artist.shortBio,
      images: artist.avatarUrl ? [{ url: artist.avatarUrl }] : undefined,
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) notFound();

  const schedule = artist.availability
    .filter((entry) => entry.isActive)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <>
      {/* Cabeçalho com retrato */}
      <header className="relative border-b border-hairline bg-ink-900/40 pt-28 md:pt-36">
        <div className="container-editorial pb-14 md:pb-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <div className="relative aspect-4/5 w-full max-w-md">
                <Image
                  src={artist.avatarUrl ?? FALLBACK_IMAGE}
                  alt={`Retrato de ${artist.name}, tatuador do Ink House`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-7 lg:pt-6">
              <span className="overline text-blood-400">
                {artist.handle ?? "Artista"}
              </span>

              <h1 className="display-title mt-4 text-[clamp(2.25rem,7vw,5rem)]">
                {artist.name}
              </h1>

              <ul className="mt-6 flex flex-wrap gap-2">
                {artist.specialties.map((specialty) => (
                  <li
                    key={specialty}
                    className="border border-hairline px-3 py-1.5 label-xs text-bone-200"
                  >
                    {specialty}
                  </li>
                ))}
              </ul>

              <p className="mt-8 max-w-xl text-base leading-relaxed text-ash-300">
                {artist.bio}
              </p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <dt className="overline text-ash-600">Experiência</dt>
                  <dd className="mt-1.5 font-display text-2xl text-bone-100">
                    {artist.yearsOfExp} anos
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ash-600">Serviços</dt>
                  <dd className="mt-1.5 font-display text-2xl text-bone-100">
                    {artist.services.length}
                  </dd>
                </div>
              </dl>

              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={`/agendamento?artista=${artist.id}`}>
                    Agendar com {artist.handle ?? artist.name.split(" ")[0]}
                    <CalendarDays aria-hidden="true" />
                  </Link>
                </Button>

                {artist.instagram ? (
                  <Button asChild variant="outline" size="lg">
                    <a
                      href={artist.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Instagram
                      <InstagramIcon className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Serviços do artista */}
      {artist.services.length > 0 ? (
        <Section>
          <div className="container-editorial">
            <SectionHeader
              eyebrow="O que faço"
              title="Serviços"
              size="sm"
              description={`Estes são os serviços que ${artist.name.split(" ")[0]} executa. Ao agendar, a duração de cada um já é reservada na agenda.`}
            />

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {artist.services.map((link, index) => (
                <Reveal as="li" key={link.service.id} delay={(index % 3) * 90}>
                  <div className="surface flex h-full flex-col p-5">
                    <span className="inline-grid size-10 place-items-center border border-hairline text-blood-500">
                      <ServiceIcon name={link.service.icon} className="size-4" />
                    </span>

                    <h3 className="mt-4 text-sm font-bold uppercase tracking-[0.08em] text-bone-100">
                      {link.service.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ash-400">
                      {link.service.shortDescription}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-ash-500">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatDuration(link.service.durationMin)}
                      </span>
                      <span className="font-semibold text-bone-200">
                        {(link.priceFrom ?? link.service.priceFrom) > 0
                          ? formatCurrency(link.priceFrom ?? link.service.priceFrom)
                          : "Sem custo"}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* Agenda semanal */}
      {schedule.length > 0 ? (
        <Section className="border-t border-hairline bg-ink-900/40" spacing="sm">
          <div className="container-editorial">
            <SectionHeader
              eyebrow="Disponibilidade"
              title="Dias de atendimento"
              size="sm"
              description="Estes são os dias em que este artista atende. Os horários livres aparecem em tempo real no agendamento."
            />

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.map((entry, index) => (
                <Reveal as="li" key={entry.id} delay={(index % 3) * 80}>
                  <div className="flex items-center justify-between gap-4 border border-hairline bg-ink-900 px-5 py-4">
                    <span className="text-sm font-semibold text-bone-100">
                      {WEEKDAY_LABELS[entry.dayOfWeek]}
                    </span>
                    <span className="text-right text-xs tabular-nums text-ash-400">
                      {entry.startTime} – {entry.endTime}
                      {entry.breakStart && entry.breakEnd ? (
                        <span className="mt-0.5 block text-ash-600">
                          pausa {entry.breakStart}–{entry.breakEnd}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* Trabalhos do artista */}
      {artist.galleryItems.length > 0 ? (
        <Section className="border-t border-hairline">
          <div className="container-editorial">
            <SectionHeader
              eyebrow="Portfólio"
              title="Trabalhos"
              size="sm"
              action={
                <Button asChild variant="outline">
                  <Link href="/galeria">
                    Ver galeria completa
                    <Sparkles aria-hidden="true" />
                  </Link>
                </Button>
              }
            />

            <div className="mt-10">
              <Gallery
                items={artist.galleryItems.map((item) => ({
                  ...item,
                  artistName: artist.name,
                }))}
              />
            </div>
          </div>
        </Section>
      ) : null}

      <FinalCta />
    </>
  );
}
