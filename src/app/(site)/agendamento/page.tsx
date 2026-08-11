import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { BookingWizard } from "@/features/booking/components/booking-wizard";
import {
  getBookableArtists,
  getBookableServices,
  getStudioRules,
} from "@/features/booking/queries";

export const metadata: Metadata = {
  title: "Agendamento online",
  description:
    "Escolha o serviço, o artista, a data e o horário ideal para sua tatuagem. Veja em tempo real os horários disponíveis na agenda do estúdio.",
  alternates: { canonical: "/agendamento" },
};

// A agenda muda a cada reserva — nunca servir esta página de cache.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, artists, rules] = await Promise.all([
    getBookableServices(),
    getBookableArtists(),
    getStudioRules(),
  ]);

  // Renderizado aqui, no servidor, e entregue ao wizard — que decide se ele
  // aparece. Na tela de confirmação ele sai de cena.
  const header = (
    <PageHeader
      eyebrow="Agendamento online"
      title="Reserve seu horário"
      description="Em poucos passos você escolhe o serviço, o artista e o melhor horário. Mostramos apenas o que está realmente livre na agenda."
    />
  );

  return (
    <>
      {/* useSearchParams exige Suspense: o wizard lê o estado da URL. */}
      <Suspense fallback={<WizardSkeleton header={header} />}>
        <BookingWizard
          header={header}
          services={services.map((service) => ({
            id: service.id,
            slug: service.slug,
            name: service.name,
            shortDescription: service.shortDescription,
            durationMin: service.durationMin,
            bufferMin: service.bufferMin,
            priceFrom: service.priceFrom,
            icon: service.icon,
          }))}
          artists={artists.map((artist) => ({
            id: artist.id,
            slug: artist.slug,
            name: artist.name,
            handle: artist.handle,
            shortBio: artist.shortBio,
            avatarUrl: artist.avatarUrl,
            specialties: artist.specialties,
            serviceIds: artist.services.map((link) => link.serviceId),
          }))}
          minLeadTimeHours={rules.minLeadTimeHours}
          maxAdvanceDays={rules.maxAdvanceDays}
        />
      </Suspense>
    </>
  );
}

function WizardSkeleton({ header }: { header: React.ReactNode }) {
  return (
    <>
      {header}

      <div className="container-editorial grid gap-8 pb-24 md:pb-32 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="skeleton h-8 w-full max-w-lg" />
          <div className="skeleton h-12 w-72" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton h-44" />
            ))}
          </div>
        </div>
        <span className="sr-only">Carregando agendamento…</span>
      </div>
    </>
  );
}
