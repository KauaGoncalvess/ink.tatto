import Image from "next/image";
import { Images } from "lucide-react";

import { AdminPageHeader, EmptyState, Panel, Tag } from "@/components/admin/ui";
import { GalleryDialog } from "@/features/admin/components/gallery-dialog";
import { prisma } from "@/lib/prisma";
import { BLUR_DATA_URL } from "@/config/images";

export const metadata = { title: "Galeria" };
export const dynamic = "force-dynamic";

export default async function GalleryAdminPage() {
  const [items, artists] = await Promise.all([
    prisma.galleryItem.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: { artist: { select: { name: true } } },
    }),
    prisma.artist.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Galeria"
        description="Trabalhos exibidos no site. O texto alternativo é obrigatório — é o que leitores de tela anunciam."
        action={<GalleryDialog mode="create" artists={artists} />}
      />

      {items.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Images className="size-5" aria-hidden="true" />}
            title="Galeria vazia"
            description="Adicione fotos dos trabalhos do estúdio para exibir no site."
            action={<GalleryDialog mode="create" artists={artists} />}
          />
        </Panel>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <Panel className="flex h-full flex-col overflow-hidden">
                <div className="relative aspect-3/4 bg-ink-800">
                  <Image
                    src={item.imageUrl}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover"
                  />
                  {!item.isPublished ? (
                    <span className="absolute left-2 top-2 border border-hairline-strong bg-ink-950/85 px-2 py-1 text-[0.5625rem] uppercase tracking-widest text-ash-300 backdrop-blur-sm">
                      Rascunho
                    </span>
                  ) : null}
                  {item.isFeatured ? (
                    <span className="absolute right-2 top-2 bg-blood-500 px-2 py-1 text-[0.5625rem] uppercase tracking-widest text-bone-100">
                      Destaque
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h2 className="truncate text-sm font-medium text-bone-100">
                    {item.title}
                  </h2>
                  <span className="mt-1 block truncate text-xs text-ash-500">
                    {item.artist?.name ?? "Sem artista"}
                  </span>

                  <div className="mt-3 flex items-end justify-between gap-2">
                    <Tag>{item.style}</Tag>
                    <GalleryDialog
                      mode="edit"
                      artists={artists}
                      item={serialize(item)}
                    />
                  </div>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function serialize(item: {
  id: string;
  title: string;
  style: string;
  imageUrl: string;
  alt: string;
  description: string | null;
  bodyPart: string | null;
  artistId: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
}) {
  return {
    id: item.id,
    title: item.title,
    style: item.style,
    imageUrl: item.imageUrl,
    alt: item.alt,
    description: item.description ?? "",
    bodyPart: item.bodyPart ?? "",
    artistId: item.artistId ?? "",
    isPublished: item.isPublished,
    isFeatured: item.isFeatured,
    displayOrder: String(item.displayOrder),
  };
}
