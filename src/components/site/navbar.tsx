"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Menu, Phone } from "lucide-react";

import { Logo } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { siteConfig, whatsappLink } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Navegação principal.
 *
 * Transparente sobre o hero e opaca com blur depois do scroll. O listener usa
 * requestAnimationFrame para não disparar setState a cada pixel — a barra é
 * fixa e roda em toda página, então precisa ser barata.
 */

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled
          ? "border-b border-hairline bg-ink-950/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-editorial">
        <div
          className={cn(
            "flex items-center justify-between gap-6 transition-[height] duration-500",
            scrolled ? "h-16 md:h-18" : "h-20 md:h-24",
          )}
        >
          <Logo size="sm" className="shrink-0" />

          {/* Navegação desktop */}
          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              <li>
                <NavLink href="/" active={isActive("/")}>
                  Home
                </NavLink>
              </li>
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} active={isActive(item.href)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contato + CTA */}
          <div className="flex items-center gap-3">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-3 xl:flex group"
            >
              <span className="grid size-9 place-items-center border border-hairline text-blood-500 transition-colors group-hover:border-blood-500 group-hover:bg-blood-500 group-hover:text-bone-100">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="overline text-ash-500">Agende seu horário</span>
                <span className="text-sm font-semibold text-bone-100">
                  {siteConfig.contact.phone}
                </span>
              </span>
            </a>

            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/agendamento">
                Agendar
                <Calendar aria-hidden="true" />
              </Link>
            </Button>

            {/* Menu mobile */}
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="grid size-10 place-items-center border border-hairline text-bone-100 transition-colors hover:border-hairline-strong hover:bg-ink-800 lg:hidden"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              </DialogTrigger>

              <SheetContent aria-label="Menu de navegação" className="p-0">
                {/* O fechamento é explícito no clique do link, e não num efeito
                    sobre o pathname: o efeito rodaria uma renderização depois
                    da navegação, deixando o painel visível sobre a nova página
                    por um frame. */}
                <MobileMenu isActive={isActive} onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative overline py-2 transition-colors",
        active ? "text-blood-500" : "text-bone-200 hover:text-bone-100",
      )}
    >
      {children}
      {/* Sublinhado que cresce do centro — o mesmo gesto do fio vermelho. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-0.5 left-0 h-px w-full origin-center bg-blood-500 transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}

function MobileMenu({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const links = [{ label: "Home", href: "/" }, ...siteConfig.nav];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-hairline p-6">
        <Logo size="sm" />
      </div>

      <nav aria-label="Navegação principal" className="flex-1 p-6">
        <ul className="space-y-1">
          {links.map((item, index) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-baseline gap-4 border-b border-hairline py-4 transition-colors",
                  isActive(item.href)
                    ? "text-blood-500"
                    : "text-bone-100 hover:text-blood-400",
                )}
              >
                <span className="overline text-ash-600 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-2xl uppercase tracking-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4 border-t border-hairline p-6">
        <Button asChild block size="md">
          <Link href="/agendamento" onClick={onNavigate}>
            Agendar horário
            <Calendar aria-hidden="true" />
          </Link>
        </Button>

        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-ash-400 transition-colors hover:text-bone-100"
        >
          <Phone className="size-4 text-blood-500" aria-hidden="true" />
          {siteConfig.contact.phone}
        </a>
      </div>
    </div>
  );
}
