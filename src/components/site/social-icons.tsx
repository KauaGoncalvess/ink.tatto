/**
 * Ícones de redes sociais.
 *
 * O lucide-react removeu os logotipos de marca da biblioteca, então eles são
 * desenhados aqui. Todos seguem o mesmo contrato dos ícones lucide (herdam
 * `currentColor` e recebem `className`), para trocarem de lugar sem atrito.
 */

export type SocialIconProps = { className?: string };

export function InstagramIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function TikTokIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.9 5.9 0 0 0-.76-.05A5.72 5.72 0 0 0 4.15 15.3a5.72 5.72 0 0 0 5.71 5.7 5.72 5.72 0 0 0 5.72-5.7V9.01a7.35 7.35 0 0 0 4.27 1.37V7.3a4.25 4.25 0 0 1-3.25-1.48Z" />
    </svg>
  );
}
