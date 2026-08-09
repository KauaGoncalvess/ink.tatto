import { PenTool } from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  Tag,
  Td,
  TableWrap,
  Th,
} from "@/components/admin/ui";
import { ServiceIcon } from "@/components/site/service-icon";
import { ServiceDialog } from "@/features/admin/components/service-dialog";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDuration } from "@/lib/utils";

export const metadata = { title: "Serviços" };
export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { appointments: true, artists: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="Serviços"
        description="A duração e o buffer de cada serviço alimentam diretamente o cálculo de horários disponíveis no site."
        action={<ServiceDialog mode="create" />}
      />

      <Panel>
        {services.length === 0 ? (
          <EmptyState
            icon={<PenTool className="size-5" aria-hidden="true" />}
            title="Nenhum serviço cadastrado"
            description="Cadastre os serviços para que os clientes possam agendar pelo site."
            action={<ServiceDialog mode="create" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Serviço</Th>
                  <Th>Duração</Th>
                  <Th>Preço inicial</Th>
                  <Th className="text-center">Artistas</Th>
                  <Th className="text-center">Agendamentos</Th>
                  <Th>Situação</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="transition-colors hover:bg-ink-850">
                    <Td>
                      <span className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center border border-hairline text-blood-500">
                          <ServiceIcon name={service.icon} className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-bone-100">
                            {service.name}
                          </span>
                          <span className="mt-0.5 block max-w-xs truncate text-xs text-ash-500">
                            {service.shortDescription}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ash-300">
                      {formatDuration(service.durationMin)}
                      <span className="mt-0.5 block text-[0.625rem] text-ash-600">
                        +{service.bufferMin}min buffer
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ash-300">
                      {service.priceFrom > 0
                        ? formatCurrency(service.priceFrom)
                        : "Sem custo"}
                    </Td>
                    <Td className="text-center tabular-nums text-ash-400">
                      {service._count.artists}
                    </Td>
                    <Td className="text-center tabular-nums text-ash-400">
                      {service._count.appointments}
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1.5">
                        <Tag
                          className={
                            service.isActive
                              ? "border-status-confirmed/40 text-status-confirmed"
                              : "text-ash-600"
                          }
                        >
                          {service.isActive ? "Ativo" : "Inativo"}
                        </Tag>
                        {service.isFeatured ? (
                          <Tag className="border-blood-700 text-blood-400">Destaque</Tag>
                        ) : null}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <ServiceDialog mode="edit" service={serialize(service)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>

            {/* Cards — mobile */}
            <ul className="divide-y divide-hairline md:hidden">
              {services.map((service) => (
                <li key={service.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-hairline text-blood-500">
                      <ServiceIcon name={service.icon} className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="block font-semibold text-bone-100">
                        {service.name}
                      </span>
                      <span className="mt-1 block text-xs text-ash-500">
                        {formatDuration(service.durationMin)} ·{" "}
                        {service.priceFrom > 0
                          ? formatCurrency(service.priceFrom)
                          : "Sem custo"}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Tag
                          className={
                            service.isActive
                              ? "border-status-confirmed/40 text-status-confirmed"
                              : "text-ash-600"
                          }
                        >
                          {service.isActive ? "Ativo" : "Inativo"}
                        </Tag>
                        {service.isFeatured ? (
                          <Tag className="border-blood-700 text-blood-400">Destaque</Tag>
                        ) : null}
                      </span>
                    </div>

                    <ServiceDialog mode="edit" service={serialize(service)} />
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

function serialize(service: {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  icon: string;
  imageUrl: string | null;
  durationMin: number;
  bufferMin: number;
  priceFrom: number;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
}) {
  return {
    id: service.id,
    name: service.name,
    shortDescription: service.shortDescription,
    description: service.description,
    icon: service.icon,
    imageUrl: service.imageUrl ?? "",
    durationMin: String(service.durationMin),
    bufferMin: String(service.bufferMin),
    // O banco guarda centavos; o formulário edita em reais.
    priceFrom: (service.priceFrom / 100).toFixed(2),
    isActive: service.isActive,
    isFeatured: service.isFeatured,
    displayOrder: String(service.displayOrder),
  };
}
