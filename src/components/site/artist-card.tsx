import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/site/social-icons";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { cn } from "@/lib/utils";

export type ArtistCardData = {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  shortBio: string;
  avatarUrl: string | null;
  specialties: string[];
  instagram: string | null;
};

/**
 * Card de artista.
 *
 * O botão "agendar com este artista" leva ao wizard já com o artista na query
 * string — é por isso que o estado do agendamento vive na URL: o link é a
 * integração inteira, sem estado global nem contexto compartilhado.
 */
export function ArtistCard({
  artist,
  className,
  headingAs: Heading = "h3",
}: {
  artist: ArtistCardData;
  className?: string;
  /**
   * Nível do título do card. Em `/artistas` os cards vêm logo abaixo do <h1>
   * da página, sem <h2> no meio — fixar h3 aqui criaria um degrau vago na
   * hierarquia, que é justamente o que o leitor de tela usa para navegar.
   */
  headingAs?: "h2" | "h3";
}) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <div className="relative aspect-4/5 overflow-hidden bg-ink-900">
        <Image
          src={artist.avatarUrl ?? FALLBACK_IMAGE}
          alt={`Retrato de ${artist.name}, tatuador do estúdio`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        />

        <div aria-hidden="true" className="absolute inset-0 photo-scrim" />

        {/* Especialidades sobre a foto */}
        <ul className="absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
          {artist.specialties.slice(0, 3).map((specialty) => (
            <li
              key={specialty}
              className="border border-hairline-strong bg-ink-950/70 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-bone-200 backdrop-blur-sm"
            >
              {specialty}
            </li>
          ))}
        </ul>

        {artist.instagram ? (
          <a
            href={artist.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram de ${artist.name}`}
            className="absolute right-4 top-4 grid size-10 place-items-center border border-hairline-strong bg-ink-950/70 text-bone-200 backdrop-blur-sm transition-colors hover:bg-blood-500 hover:text-bone-100"
          >
            <InstagramIcon className="size-4" />
          </a>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <Heading className="font-display text-2xl uppercase tracking-tight text-bone-100">
          <Link
            href={`/artistas/${artist.slug}`}
            className="transition-colors hover:text-blood-400"
          >
            {artist.name}
          </Link>
        </Heading>

        {artist.handle ? (
          <span className="mt-1 overline text-blood-400">{artist.handle}</span>
        ) : null}

        <p className="mt-3 flex-1 text-sm leading-relaxed text-ash-400">
          {artist.shortBio}
        </p>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-6 w-full"
        >
          <Link href={`/agendamento?artista=${artist.id}`}>
            Agendar com {artist.handle ?? artist.name.split(" ")[0]}
            <CalendarDays aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
