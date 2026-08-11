import Image from "next/image";
import { Quote, Star } from "lucide-react";

import { BLUR_DATA_URL } from "@/config/images";
import { cn, initials } from "@/lib/utils";

export type TestimonialData = {
  id: string;
  clientName: string;
  avatarUrl: string | null;
  rating: number;
  content: string;
  serviceName: string | null;
  artistName: string | null;
};

function Rating({ value }: { value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div className="flex items-center gap-0.5">
      {/* Uma única string para leitores de tela, em vez de cinco ícones soltos. */}
      <span className="sr-only">{rounded} de 5 estrelas</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            "size-3.5",
            index < rounded ? "fill-blood-500 text-blood-500" : "text-ink-600",
          )}
        />
      ))}
    </div>
  );
}

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: TestimonialData;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        // min-w-0: sem isto, o `truncate` do rodapé (white-space: nowrap)
        // aumenta a largura mínima do card, que por sua vez estica a coluna do
        // grid — o texto não corta e a página ganha scroll horizontal.
        "surface relative flex h-full min-w-0 flex-col p-6 transition-colors duration-500 hover:border-hairline-strong sm:p-8",
        className,
      )}
    >
      <Quote
        aria-hidden="true"
        className="absolute right-6 top-6 size-8 text-ink-700"
      />

      <Rating value={testimonial.rating} />

      <blockquote className="mt-5 flex-1">
        <p className="text-sm leading-relaxed text-bone-200 text-pretty">
          “{testimonial.content}”
        </p>
      </blockquote>

      <figcaption className="mt-7 flex items-center gap-3 border-t border-hairline pt-5">
        <span className="relative size-11 shrink-0 overflow-hidden bg-ink-700">
          {testimonial.avatarUrl ? (
            <Image
              src={testimonial.avatarUrl}
              alt=""
              aria-hidden="true"
              fill
              sizes="44px"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-xs font-semibold text-ash-400">
              {initials(testimonial.clientName)}
            </span>
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-bone-100">
            {testimonial.clientName}
          </span>
          <span className="mt-0.5 block truncate label-xs text-ash-500">
            {[testimonial.serviceName, testimonial.artistName]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
