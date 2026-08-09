import Link from "next/link";
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

export function Footer() {
  const navLinks = [{ label: "Home", href: "/" }, ...siteConfig.nav];

  return (
    <footer className="relative border-t border-hairline bg-ink-900">
      <div className="container-editorial py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Marca */}
          <div className="lg:col-span-4">
            <Logo size="md" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ash-400">
              {siteConfig.studioMotto}
            </p>

            <ul className="mt-8 flex items-center gap-3">
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
          <nav aria-label="Navegação do rodapé" className="lg:col-span-3">
            <h2 className="overline text-bone-100">Navegação</h2>
            <ul className="mt-6 space-y-3">
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
          <div className="lg:col-span-3">
            <h2 className="overline text-bone-100">Contato</h2>
            <ul className="mt-6 space-y-4 text-sm">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-ash-400 transition-colors hover:text-bone-100"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex items-start gap-3 text-ash-400 transition-colors hover:text-bone-100"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3 text-ash-400">
                <MapPin className="mt-0.5 size-4 shrink-0 text-blood-500" aria-hidden="true" />
                <address className="not-italic leading-relaxed">
                  {formattedAddress()}
                </address>
              </li>
            </ul>
          </div>

          {/* Horário */}
          <div className="lg:col-span-2">
            <h2 className="overline text-bone-100">Funcionamento</h2>
            <ul className="mt-6 space-y-4 text-sm">
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

      <div className="border-t border-hairline">
        <div className="container-editorial flex flex-col items-center justify-between gap-3 py-6 text-xs text-ash-600 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.studioName}{" "}
            {siteConfig.studioTagline}. Todos os direitos reservados.
          </p>
          <Link
            href="/admin"
            className="transition-colors hover:text-ash-400"
          >
            Área administrativa
          </Link>
        </div>
      </div>
    </footer>
  );
}
