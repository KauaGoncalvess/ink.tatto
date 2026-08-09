import { siteConfig } from "@/config/site";

/**
 * Dados estruturados schema.org.
 *
 * `TattooParlor` é um tipo reconhecido pelo Google e habilita o painel de
 * negócio local na busca — endereço, telefone, horário e avaliação.
 *
 * O JSON é serializado com JSON.stringify e os caracteres `<` escapados: o
 * conteúdo vem da configuração da marca, mas escapar evita que uma edição
 * futura com um `</script>` no texto quebre (ou abra) a página.
 */

function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function StudioJsonLd() {
  const { contact, openingHours } = siteConfig;

  const dayMap: Record<string, string[]> = {
    "Segunda a sexta": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    Sábado: ["Saturday"],
    Domingo: ["Sunday"],
  };

  const specification = openingHours
    .filter((entry) => !/fechado/i.test(entry.hours))
    .map((entry) => {
      const [opens, closes] = entry.hours
        .replace(/\s*às\s*/i, "-")
        .split("-")
        .map((part) => part.trim().replace("h", ":").padEnd(5, "0"));

      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayMap[entry.label] ?? [],
        opens,
        closes,
      };
    });

  const data = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    name: `${siteConfig.studioName} ${siteConfig.studioTagline}`,
    description: siteConfig.studioDescription,
    url: siteConfig.url,
    telephone: contact.phone,
    email: contact.email,
    priceRange: "$$",
    image: `${siteConfig.url}/images/hero/tattoo-machine.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.street,
      addressLocality: contact.address.city,
      addressRegion: contact.address.state,
      postalCode: contact.address.zip,
      addressCountry: contact.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: contact.address.latitude,
      longitude: contact.address.longitude,
    },
    openingHoursSpecification: specification,
    sameAs: [
      siteConfig.social.instagram,
      siteConfig.social.facebook,
      siteConfig.social.tiktok,
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Conteúdo estático e escapado; não há entrada de usuário aqui.
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
