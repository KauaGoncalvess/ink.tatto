import { MessageSquareQuote, Star } from "lucide-react";

import { AdminPageHeader, EmptyState, Panel, Tag } from "@/components/admin/ui";
import { TestimonialDialog } from "@/features/admin/components/testimonial-dialog";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

export default async function TestimonialsAdminPage() {
  const [items, artists] = await Promise.all([
    prisma.testimonial.findMany({
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
        title="Depoimentos"
        description="Avaliações exibidas na página inicial. Publique apenas o que o cliente autorizou."
        action={<TestimonialDialog mode="create" artists={artists} />}
      />

      {items.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<MessageSquareQuote className="size-5" aria-hidden="true" />}
            title="Nenhum depoimento"
            description="Cadastre depoimentos de clientes para exibir na home."
            action={<TestimonialDialog mode="create" artists={artists} />}
          />
        </Panel>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Panel className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-bone-100">
                      {item.clientName}
                    </h2>
                    <div className="mt-1.5 flex items-center gap-0.5">
                      <span className="sr-only">{item.rating} de 5 estrelas</span>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          aria-hidden="true"
                          className={cn(
                            "size-3",
                            index < item.rating
                              ? "fill-blood-500 text-blood-500"
                              : "text-ink-600",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <TestimonialDialog
                    mode="edit"
                    artists={artists}
                    testimonial={serialize(item)}
                  />
                </div>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-ash-300">
                  “{item.content}”
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                  {item.serviceName ? <Tag>{item.serviceName}</Tag> : null}
                  {item.artist ? <Tag>{item.artist.name}</Tag> : null}
                  <Tag
                    className={
                      item.isPublished
                        ? "border-status-confirmed/40 text-status-confirmed"
                        : "text-ash-600"
                    }
                  >
                    {item.isPublished ? "Publicado" : "Rascunho"}
                  </Tag>
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
  clientName: string;
  avatarUrl: string | null;
  rating: number;
  content: string;
  serviceName: string | null;
  artistId: string | null;
  isPublished: boolean;
  displayOrder: number;
}) {
  return {
    id: item.id,
    clientName: item.clientName,
    avatarUrl: item.avatarUrl ?? "",
    rating: String(item.rating),
    content: item.content,
    serviceName: item.serviceName ?? "",
    artistId: item.artistId ?? "",
    isPublished: item.isPublished,
    displayOrder: String(item.displayOrder),
  };
}
