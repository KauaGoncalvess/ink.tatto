/**
 * Configuração central da marca.
 *
 * Nada de nome de estúdio, telefone ou endereço espalhado pelo código —
 * tudo que identifica o negócio mora aqui. Os campos que o dono do estúdio
 * precisa editar sem deploy vivem em `StudioSettings` no banco (ver
 * `src/features/settings`); este arquivo é o fallback usado em build time,
 * em metadata e quando o banco ainda não foi populado.
 */

export type NavItem = {
  label: string;
  href: string;
};

export type OpeningHours = {
  label: string;
  hours: string;
};

export const siteConfig = {
  /** Nome curto usado no logo e nos títulos. */
  studioName: "Ink House",
  /** Complemento do logo. */
  studioTagline: "Tattoo Studio",
  /** Frase de posicionamento, usada no footer e no OG. */
  studioMotto: "Arte que marca. Histórias que ficam.",
  /** Descrição usada em metadata e JSON-LD. */
  studioDescription:
    "Estúdio de tatuagem autoral em São Paulo. Artistas especializados em realismo, blackwork, fine line e oriental, com ambiente seguro, esterilizado e atendimento personalizado.",

  /** URL canônica pública. Sobrescreva com NEXT_PUBLIC_SITE_URL em produção. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** Fuso horário padrão do estúdio (sobrescrito por StudioSettings.timezone). */
  timezone: "America/Sao_Paulo",
  /** Moeda usada na formatação de preços. */
  currency: "BRL",
  locale: "pt-BR",

  contact: {
    /** Formato de exibição. */
    phone: "(11) 98765-4321",
    /** Somente dígitos com DDI — usado nos deep links wa.me. */
    whatsapp: "5511987654321",
    email: "contato@inkhouse.studio",
    address: {
      street: "Rua das Tatuagens, 123",
      district: "Vila Madalena",
      city: "São Paulo",
      state: "SP",
      zip: "05435-000",
      country: "BR",
      /** Coordenadas usadas no JSON-LD. */
      latitude: -23.5546,
      longitude: -46.6903,
    },
  },

  social: {
    instagram: "https://instagram.com/inkhouse.studio",
    facebook: "https://facebook.com/inkhouse.studio",
    tiktok: "https://tiktok.com/@inkhouse.studio",
  },

  /** Horário de funcionamento exibido no site. A regra real de agendamento
   *  vem de `StudioSettings` no banco — isto é apenas apresentação. */
  openingHours: [
    { label: "Segunda a sexta", hours: "08:00 às 20:00" },
    { label: "Sábado", hours: "09:00 às 18:00" },
    { label: "Domingo", hours: "Fechado" },
  ] satisfies OpeningHours[],

  nav: [
    { label: "Sobre", href: "/sobre" },
    { label: "Artistas", href: "/artistas" },
    { label: "Serviços", href: "/servicos" },
    { label: "Galeria", href: "/galeria" },
    { label: "Agendamento", href: "/agendamento" },
    { label: "Contato", href: "/contato" },
  ] satisfies NavItem[],
} as const;

export type SiteConfig = typeof siteConfig;

/** Link do WhatsApp já com mensagem pré-preenchida. */
export function whatsappLink(message?: string, phone?: string): string {
  const number = (phone ?? siteConfig.contact.whatsapp).replace(/\D/g, "");
  const text = message ?? `Olá! Gostaria de agendar um horário no ${siteConfig.studioName}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Endereço em uma linha, para footer e JSON-LD. */
export function formattedAddress(): string {
  const { street, district, city, state } = siteConfig.contact.address;
  return `${street} — ${district}, ${city}/${state}`;
}
