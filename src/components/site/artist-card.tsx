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

type Props = {
  artist: ArtistCardData;
  className?: string;
  /**
   * Nível do título do card. Em `/artistas` os cards vêm logo abaixo do <h1>
   * da página, sem <h2> no meio — fixar h3 aqui criaria um degrau vago na
   * hierarquia, que é justamente o que o leitor de tela usa para navegar.
   */
  headingAs?: "h2" | "h3";
  /**
   * `full` é o card de retrato da página de artistas. `compact` é a versão
   * horizontal usada na home: mesma informação, 180px de altura no lugar de
   * 700. Três cards completos empilhados custavam 2.366px de rolagem no
   * celular para uma seção que é só uma prévia — quem quer ver todo mundo
   * clica em "conhecer todos".
   */
  variant?: "full" | "compact";
  /**
   * Ênfase do botão. Em `/artistas` ele é a razão de ser da página e vem
   * `primary`; na home fica `outline` para a seção não virar parede de
   * vermelho.
   */
  emphasis?: "primary" | "outline";
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
  variant = "full",
  emphasis = "outline",
}: Props) {
  const firstName = artist.handle ?? artist.name.split(" ")[0];

  const specialties = artist.specialties.slice(0, 3);

  /* As especialidades ficavam sobre a foto, e sobre uma foto escura elas
     simplesmente não eram legíveis. Aqui em cima do nome elas cumprem o papel
     que sempre tiveram: dizer, antes de tudo, se este artista faz o que você
     quer. */
  const specialtyList =
    specialties.length > 0 ? (
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {specialties.map((specialty) => (
          <li key={specialty} className="label-xs text-ash-500">
            {specialty}
          </li>
        ))}
      </ul>
    ) : null;

  const cta = (
    <Button asChild variant={emphasis} size="sm" className="w-full">
      <Link href={`/agendamento?artista=${artist.id}`}>
        Agendar com {firstName}
        <CalendarDays aria-hidden="true" />
      </Link>
    </Button>
  );

  const name = (
    <Heading
      className={cn(
        "font-display uppercase tracking-tight text-bone-100",
        variant === "compact" ? "text-xl" : "text-2xl",
      )}
    >
      <Link
        href={`/artistas/${artist.slug}`}
        className="transition-colors hover:text-blood-400"
      >
        {artist.name}
      </Link>
    </Heading>
  );

  if (variant === "compact") {
    return (
      <article
        className={cn("group flex gap-4 border border-hairline p-4", className)}
      >
        <div className="relative size-24 shrink-0 overflow-hidden bg-ink-900">
          <Image
            src={artist.avatarUrl ?? FALLBACK_IMAGE}
            alt={`Retrato de ${artist.name}, tatuador do estúdio`}
            fill
            sizes="96px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {specialtyList}
          {name}
          <p className="line-clamp-2 text-sm leading-relaxed text-ash-400">
            {artist.shortBio}
          </p>
          <div className="mt-1">{cta}</div>
        </div>
      </article>
    );
  }

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
        {specialtyList ? <div className="mb-3">{specialtyList}</div> : null}

        {name}

        {artist.handle ? (
          <span className="mt-1 overline text-blood-400">{artist.handle}</span>
        ) : null}

        <p className="mt-3 flex-1 text-sm leading-relaxed text-ash-400">
          {artist.shortBio}
        </p>

        <div className="mt-6">{cta}</div>
      </div>
    </article>
  );
}
