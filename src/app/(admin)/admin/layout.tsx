import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/shell";
import { requireSession } from "@/lib/auth/guards";
import { countUnreadNotifications } from "@/lib/notifier";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Ink House" },
  robots: { index: false, follow: false },
};

/**
 * Layout do painel.
 *
 * O middleware já barrou quem não tem cookie, mas `requireSession` roda de
 * novo aqui: middleware protege a navegação, esta chamada protege o render.
 *
 * A rota /admin/login tem o próprio layout (fora desta árvore) justamente por
 * não poder exigir sessão.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const unreadCount = await countUnreadNotifications();

  return (
    <AdminShell
      user={{ name: session.name, email: session.email, role: session.role }}
      unreadCount={unreadCount}
    >
      {children}
    </AdminShell>
  );
}
