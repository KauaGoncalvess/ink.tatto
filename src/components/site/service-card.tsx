import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";

import { ServiceIcon } from "@/components/site/service-icon";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";

export type ServiceCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  imageUrl: string | null;
  durationMin: number;
  priceFrom: number;
};

/**
 * Card de serviço.
 *
 * A fotografia fica em opacidade baixa no fundo e sobe no hover, junto com um
 * leve zoom. O card inteiro é clicável através de um link em overlay — assim o
 * alvo de toque no mobile é a área toda, sem aninhar elementos interativos.
 */
export function ServiceCard({
  service,
  className,
}: {
  service: ServiceCardData;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative isolate flex min-h-64 flex-col justify-between overflow-hidden",
        "surface p-6 transition-colors duration-500 hover:border-hairline-strong sm:p-7",
        className,
      )}
    >
      {/* Fundo fotográfico */}
      <Image
        src={service.imageUrl ?? FALLBACK_IMAGE}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="-z-10 object-cover opacity-15 transition-[opacity,transform] duration-700 group-hover:scale-105 group-hover:opacity-30"
      />
      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/60"
      />

      <div>
        <span className="inline-grid size-12 place-items-center border border-hairline text-blood-500 transition-colors duration-500 group-hover:border-blood-500 group-hover:bg-blood-500 group-hover:text-bone-100">
          <ServiceIcon name={service.icon} className="size-5" />
        </span>

        <h3 className="mt-6 text-sm font-bold uppercase leading-snug tracking-[0.1em] text-bone-100">
          <Link href={`/servicos#${service.slug}`} className="before:absolute before:inset-0">
            {service.name}
          </Link>
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-ash-400">
          {service.shortDescription}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-hairline pt-4">
        <div>
          <span className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-ash-500">
            <Clock className="size-3" aria-hidden="true" />
            {formatDuration(service.durationMin)}
          </span>
          <span className="mt-1.5 block text-sm font-semibold text-bone-100">
            {service.priceFrom > 0 ? (
              <>
                <span className="text-[0.625rem] uppercase tracking-widest text-ash-500">
                  a partir de{" "}
                </span>
                {formatCurrency(service.priceFrom)}
              </>
            ) : (
              "Sem custo"
            )}
          </span>
        </div>

        <ArrowUpRight
          aria-hidden="true"
          className="size-5 shrink-0 text-ash-600 transition-[color,transform] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blood-500"
        />
      </div>
    </article>
  );
}
