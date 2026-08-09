"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  MessageSquareQuote,
  PenTool,
  Settings,
  Timer,
  Users,
  UserSquare,
} from "lucide-react";

import { Logo } from "@/components/site/brand";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { logout } from "@/features/auth/actions";
import { cn, initials } from "@/lib/utils";

/**
 * Casca do painel administrativo.
 *
 * Também escura, e propositalmente: um dashboard claro dentro de uma marca
 * preta seria uma segunda identidade. Aqui a mesma linguagem do site continua —
 * fios de 1px, tipografia em caixa alta, vermelho só como indicador.
 *
 * Desktop: sidebar fixa. Mobile: mesma navegação dentro de um drawer.
 */

type NavEntry = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Somente administradores veem. */
  adminOnly?: boolean;
};

const NAV: NavEntry[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/agendamentos", label: "Agendamentos", Icon: CalendarDays },
  { href: "/admin/calendario", label: "Calendário", Icon: CalendarRange },
  { href: "/admin/clientes", label: "Clientes", Icon: Users },
  { href: "/admin/artistas", label: "Artistas", Icon: UserSquare },
  { href: "/admin/servicos", label: "Serviços", Icon: PenTool, adminOnly: true },
  { href: "/admin/horarios", label: "Horários", Icon: Timer, adminOnly: true },
  { href: "/admin/galeria", label: "Galeria", Icon: Images },
  { href: "/admin/depoimentos", label: "Depoimentos", Icon: MessageSquareQuote },
  { href: "/admin/configuracoes", label: "Configurações", Icon: Settings, adminOnly: true },
];

export type AdminUser = {
  name: string;
  email: string;
  role: "ADMIN" | "ARTIST";
};

export function AdminShell({
  user,
  unreadCount,
  children,
}: {
  user: AdminUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const entries = NAV.filter((entry) => !entry.adminOnly || user.role === "ADMIN");

  return (
    <div className="min-h-dvh bg-ink-950 lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-hairline bg-ink-900 lg:flex lg:h-dvh lg:flex-col lg:sticky lg:top-0">
        <SidebarContent
          entries={entries}
          pathname={pathname}
          user={user}
          unreadCount={unreadCount}
        />
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Topo mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-hairline bg-ink-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo size="sm" compact />

          <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-ash-400">
            {entries.find((entry) => isActive(pathname, entry.href))?.label ?? "Painel"}
          </span>

          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="relative grid size-10 shrink-0 place-items-center border border-hairline text-bone-100 transition-colors hover:bg-ink-800"
                aria-label="Abrir menu do painel"
              >
                <Menu className="size-5" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 grid size-4 place-items-center bg-blood-500 text-[0.5625rem] font-bold text-bone-100"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            </DialogTrigger>

            <SheetContent side="left" aria-label="Menu do painel" className="p-0">
              {/* Fechamento explícito no clique, em vez de um efeito sobre o
                  pathname que só rodaria depois da navegação. */}
              <SidebarContent
                entries={entries}
                pathname={pathname}
                user={user}
                unreadCount={unreadCount}
                onNavigate={() => setMenuOpen(false)}
              />
            </SheetContent>
          </Dialog>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function SidebarContent({
  entries,
  pathname,
  user,
  unreadCount,
  onNavigate,
}: {
  entries: NavEntry[];
  pathname: string;
  user: AdminUser;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline p-5">
        <Logo size="sm" />
      </div>

      <nav aria-label="Navegação do painel" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {entries.map((entry) => {
            const active = isActive(pathname, entry.href);
            const showBadge = entry.href === "/admin/agendamentos" && unreadCount > 0;

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-ink-800 text-bone-100"
                      : "text-ash-400 hover:bg-ink-850 hover:text-bone-200",
                  )}
                >
                  {/* Marcador vermelho na aba ativa. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 left-0 w-0.5 bg-blood-500 transition-transform",
                      active ? "scale-y-100" : "scale-y-0",
                    )}
                  />
                  <entry.Icon
                    className={cn("size-4 shrink-0", active && "text-blood-500")}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{entry.label}</span>

                  {showBadge ? (
                    <span className="grid min-w-5 shrink-0 place-items-center bg-blood-500 px-1 text-[0.625rem] font-bold text-bone-100">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-hairline pt-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-ash-500 transition-colors hover:text-bone-200"
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            Ver site público
          </Link>
        </div>
      </nav>

      {/* Usuário */}
      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center border border-hairline bg-ink-800 text-xs font-bold text-bone-200">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-bone-100">{user.name}</span>
            <span className="block truncate text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
              {user.role === "ADMIN" ? "Administrador" : "Artista"}
            </span>
          </span>
          {unreadCount > 0 ? (
            <span
              className="shrink-0 text-blood-500"
              title={`${unreadCount} notificações não lidas`}
            >
              <Bell className="size-4" aria-hidden="true" />
              <span className="sr-only">{unreadCount} notificações não lidas</span>
            </span>
          ) : null}
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 px-3 py-2.5 text-sm text-ash-500 transition-colors hover:bg-ink-850 hover:text-blood-400"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
