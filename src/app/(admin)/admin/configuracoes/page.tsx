import { AdminPageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/features/admin/components/settings-form";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Somente administradores: o menu já esconde o item para artistas, mas a
  // página precisa impor a regra por conta própria.
  await requireAdmin();

  const settings = await prisma.studioSettings.findUnique({
    where: { id: "studio" },
    include: { openingHours: { orderBy: { dayOfWeek: "asc" } } },
  });

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
        title="Configurações"
        description="Dados do estúdio exibidos no site e regras que controlam o agendamento online."
      />

      <SettingsForm
        initial={{
          // Fallback para o config estático na primeira execução, antes do seed.
          name: settings?.name ?? siteConfig.studioName,
          tagline: settings?.tagline ?? siteConfig.studioTagline,
          description: settings?.description ?? siteConfig.studioDescription,
          phone: settings?.phone ?? siteConfig.contact.phone,
          whatsapp: settings?.whatsapp ?? siteConfig.contact.whatsapp,
          email: settings?.email ?? siteConfig.contact.email,
          address: settings?.address ?? siteConfig.contact.address.street,
          city: settings?.city ?? siteConfig.contact.address.city,
          state: settings?.state ?? siteConfig.contact.address.state,
          zip: settings?.zip ?? siteConfig.contact.address.zip,
          instagram: settings?.instagram ?? siteConfig.social.instagram,
          facebook: settings?.facebook ?? siteConfig.social.facebook,
          tiktok: settings?.tiktok ?? siteConfig.social.tiktok,
          timezone: settings?.timezone ?? siteConfig.timezone,
          slotStepMin: String(settings?.slotStepMin ?? 30),
          minLeadTimeHours: String(settings?.minLeadTimeHours ?? 12),
          maxAdvanceDays: String(settings?.maxAdvanceDays ?? 90),
          openingHours,
        }}
      />
    </>
  );
}
