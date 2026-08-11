import type { Metadata } from "next";

import { AdminPageHeader, Panel, PanelHeader } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requireSession } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Minha conta" };

export const dynamic = "force-dynamic";

/**
 * Conta do próprio usuário.
 *
 * Fora do grupo `adminOnly` de propósito: `/admin/configuracoes` é restrito a
 * administradores, e sem esta página um artista não teria onde trocar a
 * própria senha — dependeria de alguém rodar um comando por ele.
 */
export default async function AccountPage() {
  const session = await requireSession();

  return (
    <>
      <AdminPageHeader
        title="Minha conta"
        description="Seus dados de acesso ao painel."
      />

      {/* `items-start` para cada painel ter a altura do próprio conteúdo — sem
          isso o grid estica o de identificação até a altura do formulário e
          sobra um vazio de 200px dentro de uma borda. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Identificação" />
          <dl className="divide-y divide-hairline">
            <div className="flex items-baseline justify-between gap-4 px-5 py-4">
              <dt className="label-xs text-ash-500">Nome</dt>
              <dd className="text-sm text-bone-100">{session.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-4">
              <dt className="label-xs text-ash-500">E-mail</dt>
              <dd className="break-all text-right text-sm text-bone-100">
                {session.email}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-4">
              <dt className="label-xs text-ash-500">Papel</dt>
              <dd className="text-sm text-bone-100">
                {session.role === "ADMIN" ? "Administrador" : "Artista"}
              </dd>
            </div>
          </dl>
          <p className="border-t border-hairline px-5 py-4 text-xs leading-relaxed text-ash-500">
            Nome, e-mail e papel são definidos por um administrador. Para
            alterá-los, fale com quem administra o estúdio.
          </p>
        </Panel>

        <ChangePasswordForm />
      </div>
    </>
  );
}
