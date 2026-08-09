import Link from "next/link";
import { Ban, Users } from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  Td,
  TableWrap,
  Th,
} from "@/components/admin/ui";
import { ClientDialog } from "@/features/admin/components/client-dialog";
import { SearchBox } from "@/features/admin/components/search-box";
import { prisma } from "@/lib/prisma";
import { formatInStudio } from "@/lib/datetime";
import { formatPhone } from "@/lib/utils";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ busca?: string }> };

export default async function ClientsPage({ searchParams }: Props) {
  const { busca } = await searchParams;
  const search = busca?.trim();

  const clients = await prisma.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { appointments: true } },
    },
  });

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        description={`${clients.length} ${clients.length === 1 ? "cliente" : "clientes"} ${search ? "encontrados na busca" : "cadastrados"}.`}
        action={<ClientDialog mode="create" />}
      />

      <SearchBox placeholder="Buscar por nome, telefone ou e-mail" />

      <Panel className="mt-4">
        {clients.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="Nenhum cliente encontrado"
            description={
              search
                ? "Tente outro termo de busca."
                : "Os clientes são criados automaticamente quando alguém agenda pelo site."
            }
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Telefone</Th>
                  <Th>E-mail</Th>
                  <Th className="text-center">Agendamentos</Th>
                  <Th>Cadastro</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-ink-850">
                    <Td>
                      <Link
                        href={`/admin/clientes/${client.id}`}
                        className="inline-flex items-center gap-2 font-medium text-bone-100 transition-colors hover:text-blood-400"
                      >
                        {client.name}
                        {client.isBlocked ? (
                          <Ban
                            className="size-3.5 text-blood-500"
                            aria-label="Cliente bloqueado"
                          />
                        ) : null}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-ash-400">
                      {formatPhone(client.phone)}
                    </Td>
                    <Td className="text-ash-400">{client.email ?? "—"}</Td>
                    <Td className="text-center tabular-nums text-ash-300">
                      {client._count.appointments}
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums text-ash-500">
                      {formatInStudio(client.createdAt, "dd/MM/yyyy")}
                    </Td>
                    <Td className="text-right">
                      <ClientDialog mode="edit" client={serialize(client)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>

            {/* Cards — mobile */}
            <ul className="divide-y divide-hairline md:hidden">
              {clients.map((client) => (
                <li key={client.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/clientes/${client.id}`}
                      className="min-w-0 flex-1"
                    >
                      <span className="flex items-center gap-2 truncate font-semibold text-bone-100">
                        {client.name}
                        {client.isBlocked ? (
                          <Ban className="size-3.5 shrink-0 text-blood-500" aria-label="Bloqueado" />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs text-ash-500">
                        {formatPhone(client.phone)}
                        {client.email ? ` · ${client.email}` : ""}
                      </span>
                      <span className="mt-1 block text-xs text-ash-600">
                        {client._count.appointments} agendamento(s) · desde{" "}
                        {formatInStudio(client.createdAt, "MM/yyyy")}
                      </span>
                    </Link>

                    <ClientDialog mode="edit" client={serialize(client)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

/** Recorta só o que o formulário precisa — evita mandar campos extras ao cliente. */
function serialize(client: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  isBlocked: boolean;
}) {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email ?? "",
    notes: client.notes ?? "",
    isBlocked: client.isBlocked,
  };
}
