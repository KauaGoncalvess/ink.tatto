import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Marca gráfica do estúdio.
 *
 * O símbolo é desenhado em SVG (não é imagem): escala sem perder nitidez,
 * herda a cor do contexto e não custa uma requisição. A forma é uma agulha
 * estilizada dentro de um losango — geométrica o bastante para funcionar a
 * 20px no favicon e a 200px no footer.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      {/* Losango externo */}
      <path
        d="M16 1.5 30.5 16 16 30.5 1.5 16 16 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.35"
      />
      {/* Corpo da agulha */}
      <path
        d="M16 6.5v13.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
      {/* Ponta */}
      <path d="M16 25.5 13.4 19.7h5.2L16 25.5Z" fill="currentColor" />
      {/* Aletas laterais */}
      <path
        d="M10.8 11.4 16 8.2l5.2 3.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
        opacity="0.6"
      />
    </svg>
  );
}

export type LogoProps = {
  className?: string;
  /** Oculta o texto e deixa só o símbolo. */
  compact?: boolean;
  /** Envolve em <Link href="/">. */
  asLink?: boolean;
  /** Tamanho do bloco de texto. */
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { mark: "size-7", name: "text-base", tagline: "text-[0.5rem]" },
  md: { mark: "size-9", name: "text-xl", tagline: "text-[0.5625rem]" },
  lg: { mark: "size-12", name: "text-3xl", tagline: "text-[0.6875rem]" },
} as const;

export function Logo({
  className,
  compact = false,
  asLink = true,
  size = "md",
}: LogoProps) {
  const scale = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className={cn(scale.mark, "text-blood-500")} />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display uppercase tracking-[-0.01em] text-bone-100",
              scale.name,
            )}
          >
            {siteConfig.studioName}
          </span>
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.32em] text-ash-500 mt-1",
              scale.tagline,
            )}
          >
            {siteConfig.studioTagline}
          </span>
        </span>
      )}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      className="inline-flex transition-opacity hover:opacity-80"
      aria-label={`${siteConfig.studioName} — página inicial`}
    >
      {content}
    </Link>
  );
}
