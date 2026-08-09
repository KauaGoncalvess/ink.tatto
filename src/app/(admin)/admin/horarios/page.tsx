import { Lock, Timer } from "lucide-react";

import {
  AdminPageHeader,
  EmptyState,
  Panel,
  PanelHeader,
  Tag,
} from "@/components/admin/ui";
import { BlockList } from "@/features/admin/components/block-list";
import { OpeningHoursForm } from "@/features/admin/components/opening-hours-form";
import { prisma } from "@/lib/prisma";
import { getStudioRules } from "@/features/booking/queries";
import { formatInStudio, todayISO, WEEKDAY_LABELS } from "@/lib/datetime";

export const metadata = { title: "Horários" };
export const dynamic = "force-dynamic";

export default async function HoursPage() {
  const rules = await getStudioRules();
  const today = todayISO(rules.timezone);

  const [settings, blocks, artists] = await Promise.all([
    prisma.studioSettings.findUnique({
      where: { id: "studio" },
      include: { openingHours: { orderBy: { dayOfWeek: "asc" } } },
    }),
    prisma.blockedTime.findMany({
      // Só o que ainda importa: bloqueios que não terminaram.
      where: { endsAt: { gte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { startsAt: "asc" },
      include: { artist: { select: { name: true } } },
    }),
    prisma.artist.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Garante os sete dias no formulário mesmo que o banco esteja incompleto.
  const openingHours = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const entry = settings?.openingHours.find((item) => item.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isOpen: entry?.isOpen ?? dayOfWeek !== 0,
      opensAt: entry?.opensAt ?? "09:00",
      closesAt: entry?.closesAt ?? "20:00",
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Horários"
        description="Funcionamento do estúdio e bloqueios de agenda. Nenhum artista pode atender fora da janela do estúdio."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Funcionamento do estúdio"
            description="Limite externo: a grade de cada artista é recortada por estes horários"
          />
          <div className="p-5">
            <OpeningHoursForm initial={openingHours} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Bloqueios ativos e futuros"
            description={`${blocks.length} registro(s)`}
          />

          {blocks.length === 0 ? (
            <EmptyState
              icon={<Lock className="size-5" aria-hidden="true" />}
              title="Nenhum bloqueio"
              description="Crie folgas, férias e feriados pelo calendário para bloquear a agenda."
            />
          ) : (
            <BlockList
              blocks={blocks.map((block) => ({
                id: block.id,
                artistName: block.artist?.name ?? null,
                reason: block.reason,
                note: block.note,
                startsAtLabel: formatInStudio(
                  block.startsAt,
                  "dd/MM/yyyy 'às' HH:mm",
                  rules.timezone,
                ),
                endsAtLabel: formatInStudio(
                  block.endsAt,
                  "dd/MM/yyyy 'às' HH:mm",
                  rules.timezone,
                ),
              }))}
              artists={artists}
            />
          )}
        </Panel>
      </div>

      {/* Resumo somente leitura, útil para conferência rápida */}
      <Panel className="mt-4">
        <PanelHeader
          title="Resumo da semana"
          description="Como o site apresenta o funcionamento ao visitante"
        />
        <ul className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {openingHours.map((day) => (
            <li
              key={day.dayOfWeek}
              className="flex items-center justify-between gap-3 border border-hairline px-4 py-3"
            >
              <span className="text-sm text-bone-200">
                {WEEKDAY_LABELS[day.dayOfWeek]}
              </span>
              {day.isOpen ? (
                <span className="text-xs tabular-nums text-ash-400">
                  {day.opensAt} – {day.closesAt}
                </span>
              ) : (
                <Tag className="text-ash-600">Fechado</Tag>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <p className="mt-4 flex items-start gap-2 text-xs text-ash-600">
        <Timer className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        O passo da grade, a antecedência mínima e a janela máxima de agendamento
        ficam em Configurações.
      </p>
    </>
  );
}
