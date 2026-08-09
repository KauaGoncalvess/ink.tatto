import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Registro não encontrado dentro do painel.
 *
 * Alcançado pelo `notFound()` das páginas de detalhe (agendamento, cliente)
 * quando o id não existe — tipicamente um link antigo para algo já excluído.
 */
export default function AdminNotFound() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="surface max-w-lg p-8 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center border border-hairline text-ash-500">
          <SearchX className="size-5" aria-hidden="true" />
        </span>

        <h1 className="mt-6 font-display text-2xl uppercase tracking-tight text-bone-100">
          Registro não encontrado
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ash-400">
          O item que você tentou abrir não existe mais — provavelmente foi
          excluído. Volte para a listagem para ver o que está ativo.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/admin">
              Ir para o dashboard
              <LayoutDashboard aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/agendamentos">Ver agendamentos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
