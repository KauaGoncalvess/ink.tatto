"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/site/brand";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/site/social-icons";
import { formattedAddress, siteConfig, whatsappLink } from "@/config/site";

const socials = [
  { label: "Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
  { label: "Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon },
  { label: "TikTok", href: siteConfig.social.tiktok, Icon: TikTokIcon },
];

/**
 * Rotas em que o rodapé completo atrapalha mais do que ajuda.
 *
 * No agendamento ele custava 1.100px de rolagem no celular — 27% da página —
 * repetindo navegação, contato e horários que já estão na barra superior. Num
 * fluxo de conversão, isso é uma saída de emergência do tamanho de um portão.
 * Aqui sobram a marca, o telefone e o caminho de volta.
 */
const MINIMAL_ROUTES = ["/agendamento"];

/**
 * Componente de cliente por um motivo só: o layout do site é quem monta o
 * rodapé, e um layout não conhece a rota atual. Não há estado nem efeito —
 * apenas a leitura do pathname.
 */
export function Footer() {
  const pathname = usePathname();
  const navLinks = [{ label: "Home", href: "/" }, ...siteConfig.nav];

  if (MINIMAL_ROUTES.includes(pathname)) {
    return <MinimalFooter />;
  }

  return (
    <footer className="relative border-t border-hairline bg-ink-900">
      <div className="container-editorial py-12 md:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Marca */}
          <div className="col-span-2 lg:col-span-4">
            <Logo size="md" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ash-400">
              {siteConfig.studioMotto}
            </p>

            <ul className="mt-6 flex items-center gap-3">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${siteConfig.studioName} no ${label}`}
                    className="grid size-10 place-items-center border border-hairline text-ash-400 transition-colors hover:border-blood-500 hover:bg-blood-500 hover:text-bone-100"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navegação */}
          <nav aria-label="Navegação do rodapé" className="min-w-0 lg:col-span-3">
            <h2 className="overline text-bone-100">Navegação</h2>
            <ul className="mt-4 space-y-2.5 md:mt-6 md:space-y-3">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-sm text-ash-400 transition-colors hover:text-bone-100"
                  >
                    <span
                      aria-hidden="true"
                      className="h-px w-0 bg-blood-500 transition-all duration-300 group-hover:w-4"
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contato */}
          <div className="min-w-0 lg:col-span-3">
            <h2 className="overline text-bone-100">Contato</h2>
            <ul className="mt-4 space-y-3 text-sm md:mt-6 md:space-y-4">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-start gap-3 text-ash-400 transition-colors hover:text-bone-100"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                  <span className="min-w-0 break-words">{siteConfig.contact.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex min-w-0 items-start gap-3 text-ash-400 transition-colors hover:text-bone-100"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                  <span className="min-w-0 break-words">{siteConfig.contact.email}</span>
                </a>
              </li>
              <li className="flex min-w-0 items-start gap-3 text-ash-400">
                <MapPin className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                <address className="min-w-0 break-words not-italic leading-relaxed">
                  {formattedAddress()}
                </address>
              </li>
            </ul>
          </div>

          {/* Horário */}
          <div className="min-w-0 lg:col-span-2">
            <h2 className="overline text-bone-100">Funcionamento</h2>
            <ul className="mt-4 space-y-3 text-sm md:mt-6 md:space-y-4">
              {siteConfig.openingHours.map((entry) => (
                <li key={entry.label}>
                  <span className="block text-bone-200">{entry.label}</span>
                  <span className="mt-1 block text-ash-500">{entry.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <BottomBar />
    </footer>
  );
}

function MinimalFooter() {
  return (
    <footer className="relative border-t border-hairline bg-ink-900">
      <div className="container-editorial flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo size="sm" />

        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-ash-400 transition-colors hover:text-bone-100"
          >
            <Phone className="size-4 shrink-0 text-blood-500" aria-hidden="true" />
            {siteConfig.contact.phone}
          </a>
          <Link
            href="/"
            className="text-ash-500 transition-colors hover:text-bone-200"
          >
            Ver o site completo
          </Link>
        </div>
      </div>

      <BottomBar />
    </footer>
  );
}

/** Faixa de copyright, comum às duas versões. */
function BottomBar() {
  return (
    <div className="border-t border-hairline">
      <div className="container-editorial flex flex-col items-center justify-between gap-3 py-6 text-xs text-ash-600 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {siteConfig.studioName}{" "}
          {siteConfig.studioTagline}. Todos os direitos reservados.
        </p>
        <Link href="/admin" className="transition-colors hover:text-ash-400">
          Área administrativa
        </Link>
      </div>
    </div>
  );
}
