import Image from "next/image";
import Link from "next/link";
import { UserSquare } from "lucide-react";

import { AdminPageHeader, EmptyState, Panel, Tag } from "@/components/admin/ui";
import { ArtistDialog } from "@/features/admin/components/artist-dialog";
import { prisma } from "@/lib/prisma";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { WEEKDAY_SHORT } from "@/lib/datetime";

export const metadata = { title: "Artistas" };
export const dynamic = "force-dynamic";

export default async function ArtistsAdminPage() {
  const [artists, services] = await Promise.all([
    prisma.artist.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        availability: { orderBy: { dayOfWeek: "asc" } },
        services: { select: { serviceId: true } },
        _count: { select: { appointments: true } },
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Artistas"
        description="Perfil público, serviços executados e grade semanal de atendimento de cada artista."
        action={<ArtistDialog mode="create" services={services} />}
      />

      {artists.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<UserSquare className="size-5" aria-hidden="true" />}
            title="Nenhum artista cadastrado"
            description="Cadastre os artistas para que apareçam no site e recebam agendamentos."
            action={<ArtistDialog mode="create" services={services} />}
          />
        </Panel>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {artists.map((artist) => {
            const workingDays = artist.availability
              .filter((entry) => entry.isActive)
              .map((entry) => entry.dayOfWeek);

            return (
              <li key={artist.id}>
                <Panel className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-4">
                    <span className="relative size-16 shrink-0 overflow-hidden bg-ink-800">
                      <Image
                        src={artist.avatarUrl || FALLBACK_IMAGE}
                        alt=""
                        aria-hidden="true"
                        fill
                        sizes="64px"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-cover"
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold text-bone-100">
                        {artist.name}
                      </h2>
                      {artist.handle ? (
                        <span className="mt-0.5 block text-[0.625rem] uppercase tracking-[0.16em] text-blood-400">
                          {artist.handle}
                        </span>
                      ) : null}
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ash-500">
                        {artist.shortBio}
                      </p>
                    </div>

                    <ArtistDialog
                      mode="edit"
                      services={services}
                      artist={serialize(artist)}
                    />
                  </div>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {artist.specialties.map((specialty) => (
                      <li key={specialty}>
                        <Tag>{specialty}</Tag>
                      </li>
                    ))}
                  </ul>

                  {/* Grade semanal resumida */}
                  <div className="mt-5">
                    <span className="text-[0.625rem] uppercase tracking-[0.14em] text-ash-600">
                      Atende
                    </span>
                    <ul className="mt-2 flex gap-1">
                      {WEEKDAY_SHORT.map((label, day) => {
                        const works = workingDays.includes(day);
                        return (
                          <li
                            key={label}
                            title={`${label}: ${works ? "atende" : "não atende"}`}
                            className={
                              works
                                ? "grid size-7 place-items-center border border-blood-700 bg-blood-700/20 text-[0.5625rem] font-semibold uppercase text-blood-400"
                                : "grid size-7 place-items-center border border-hairline text-[0.5625rem] uppercase text-ash-700"
                            }
                          >
                            {label.slice(0, 1)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-hairline pt-4 text-xs">
                    <span className="flex flex-wrap gap-1.5">
                      <Tag
                        className={
                          artist.isActive
                            ? "border-status-confirmed/40 text-status-confirmed"
                            : "text-ash-600"
                        }
                      >
                        {artist.isActive ? "Ativo" : "Inativo"}
                      </Tag>
                      {!artist.acceptsBooking ? (
                        <Tag className="border-status-pending/40 text-status-pending">
                          Agenda fechada
                        </Tag>
                      ) : null}
                    </span>

                    <Link
                      href={`/artistas/${artist.slug}`}
                      target="_blank"
                      className="text-ash-500 transition-colors hover:text-blood-400"
                    >
                      {artist._count.appointments} agendamentos ·  ver perfil
                    </Link>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

type ArtistWithRelations = {
  id: string;
  name: string;
  handle: string | null;
  shortBio: string;
  bio: string;
  specialties: string[];
  yearsOfExp: number;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  acceptsBooking: boolean;
  displayOrder: number;
  services: { serviceId: string }[];
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    isActive: boolean;
  }[];
};

function serialize(artist: ArtistWithRelations) {
  // O formulário sempre trabalha com os sete dias; dias sem linha no banco
  // viram entradas inativas com horário padrão.
  const schedule = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const entry = artist.availability.find((item) => item.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isActive: Boolean(entry?.isActive),
      startTime: entry?.startTime ?? "09:00",
      endTime: entry?.endTime ?? "18:00",
      breakStart: entry?.breakStart ?? "",
      breakEnd: entry?.breakEnd ?? "",
    };
  });

  return {
    id: artist.id,
    name: artist.name,
    handle: artist.handle ?? "",
    shortBio: artist.shortBio,
    bio: artist.bio,
    specialties: artist.specialties,
    yearsOfExp: String(artist.yearsOfExp),
    instagram: artist.instagram ?? "",
    phone: artist.phone ?? "",
    email: artist.email ?? "",
    avatarUrl: artist.avatarUrl ?? "",
    isActive: artist.isActive,
    acceptsBooking: artist.acceptsBooking,
    displayOrder: String(artist.displayOrder),
    serviceIds: artist.services.map((link) => link.serviceId),
    schedule,
  };
}
