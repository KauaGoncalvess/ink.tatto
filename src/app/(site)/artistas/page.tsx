import type { Metadata } from "next";

import { ArtistCard } from "@/components/site/artist-card";
import { FinalCta } from "@/components/site/final-cta";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Section } from "@/components/site/section";
import { getActiveArtists } from "@/features/content/queries";

export const metadata: Metadata = {
  title: "Nossos artistas",
  description:
    "Conheça os tatuadores do Ink House: realismo, blackwork, fine line, oriental e old school. Escolha o artista e agende direto com ele.",
  alternates: { canonical: "/artistas" },
};

export const revalidate = 300;

export default async function ArtistsPage() {
  const artists = await getActiveArtists();

  return (
    <>
      <PageHeader
        eyebrow="Nossos artistas"
        title="Quem vai tatuar você"
        description="Cada artista tem um repertório próprio e uma forma de trabalhar. Veja quem combina com a sua ideia e agende direto na agenda dele."
      />

      <Section>
        <div className="container-editorial">
          {artists.length === 0 ? (
            <p className="py-12 text-center text-sm text-ash-500">
              Nenhum artista cadastrado no momento.
            </p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {artists.map((artist, index) => (
                <Reveal as="li" key={artist.id} delay={(index % 3) * 110}>
                  <ArtistCard artist={artist} className="h-full" headingAs="h2" />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
