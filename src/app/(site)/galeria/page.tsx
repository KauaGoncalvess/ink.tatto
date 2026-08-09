import type { Metadata } from "next";
import Link from "next/link";

import { FinalCta } from "@/components/site/final-cta";
import { Gallery } from "@/components/site/gallery";
import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/section";
import { getGalleryItems, getGalleryStyles } from "@/features/content/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Galeria de trabalhos",
  description:
    "Tatuagens feitas no Ink House: realismo, blackwork, fine line, old school, neo traditional e oriental. Veja os trabalhos por estilo.",
  alternates: { canonical: "/galeria" },
};

export const revalidate = 300;

type Props = { searchParams: Promise<{ estilo?: string }> };

export default async function GalleryPage({ searchParams }: Props) {
  const { estilo } = await searchParams;
  const [styles, items] = await Promise.all([
    getGalleryStyles(),
    getGalleryItems({ style: estilo }),
  ]);

  const activeStyle = estilo && styles.includes(estilo) ? estilo : "todos";

  return (
    <>
      <PageHeader
        eyebrow="Nossa arte"
        title="Nossos trabalhos"
        description="Peças autorais feitas aqui no estúdio. Clique em qualquer trabalho para ver em tamanho maior, com estilo, artista e detalhes."
      />

      <Section>
        <div className="container-editorial">
          {/* Filtro por estilo — links de verdade, então funciona sem JS,
              é indexável e cada filtro tem a própria URL. */}
          <nav aria-label="Filtrar por estilo">
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterLink href="/galeria" active={activeStyle === "todos"}>
                  Todos
                </FilterLink>
              </li>
              {styles.map((style) => (
                <li key={style}>
                  <FilterLink
                    href={`/galeria?estilo=${encodeURIComponent(style)}`}
                    active={activeStyle === style}
                  >
                    {style}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-6 text-xs text-ash-600" role="status">
            {items.length}{" "}
            {items.length === 1 ? "trabalho encontrado" : "trabalhos encontrados"}
            {activeStyle !== "todos" ? ` em ${activeStyle}` : ""}.
          </p>

          <div className="mt-8">
            <Gallery items={items} layout="masonry" />
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={cn(
        "inline-block border px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-blood-500 bg-blood-500 text-bone-100"
          : "border-hairline text-ash-400 hover:border-hairline-strong hover:text-bone-100",
      )}
    >
      {children}
    </Link>
  );
}
