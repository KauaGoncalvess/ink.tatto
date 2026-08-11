"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { BLUR_DATA_URL } from "@/config/images";
import { cn } from "@/lib/utils";

/**
 * Galeria com lightbox.
 *
 * O lightbox é implementado à mão (em vez de reaproveitar o Dialog do Radix)
 * porque precisa de navegação por setas entre itens e de um layout que ocupa a
 * viewport inteira. As partes que costumam ser esquecidas estão cobertas:
 * foco preso no diálogo, Esc para fechar, scroll do body travado e devolução
 * do foco ao item de origem ao sair.
 */

export type GalleryItemData = {
  id: string;
  title: string;
  style: string;
  imageUrl: string;
  alt: string;
  description: string | null;
  bodyPart: string | null;
  artistName: string | null;
};

type Props = {
  items: GalleryItemData[];
  /** "masonry" na página da galeria, "carousel" na home. */
  layout?: "masonry" | "carousel";
  className?: string;
};

export function Gallery({ items, layout = "masonry", className }: Props) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const triggersRef = React.useRef<(HTMLButtonElement | null)[]>([]);

  const close = React.useCallback(() => {
    setOpenIndex((current) => {
      // Devolve o foco ao card que abriu o lightbox.
      if (current !== null) {
        window.requestAnimationFrame(() => triggersRef.current[current]?.focus());
      }
      return null;
    });
  }, []);

  const go = React.useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + direction + items.length) % items.length;
      });
    },
    [items.length],
  );

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ash-500">
        Nenhum trabalho publicado ainda.
      </p>
    );
  }

  return (
    <>
      <ul
        className={cn(
          layout === "masonry"
            ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            : [
                // No mobile vira carrossel com scroll-snap — gesto nativo,
                // sem JS e sem biblioteca.
                "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5",
              ],
          className,
        )}
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              layout === "carousel" && "w-[70vw] shrink-0 snap-start sm:w-auto",
              // Ritmo do masonry: alguns itens ocupam duas linhas.
              layout === "masonry" && index % 5 === 0 && "lg:row-span-2",
            )}
          >
            <button
              ref={(node) => {
                triggersRef.current[index] = node;
              }}
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Ampliar: ${item.title}, estilo ${item.style}`}
              className={cn(
                "group relative block w-full overflow-hidden bg-ink-900",
                layout === "masonry" && index % 5 === 0
                  ? "aspect-3/4 lg:aspect-3/5"
                  : "aspect-3/4",
              )}
            >
              <Image
                src={item.imageUrl}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 22vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
              />

              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-95"
              />

              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-left">
                <span className="min-w-0">
                  {/* `truncate` cortava 13 dos 20 títulos em 390px, onde cada
                      célula da grade tem 171px: "SERPENTE OR…", "RAMO DE
                      OLIV…". Duas linhas acomodam todos os títulos do acervo
                      sem alterar a altura da peça — o texto flutua sobre a
                      máscara da foto. */}
                  <span className="line-clamp-2 text-xs font-semibold uppercase leading-snug tracking-[0.1em] text-bone-100">
                    {item.title}
                  </span>
                  <span className="mt-1 block label-xs text-blood-400">
                    {item.style}
                  </span>
                </span>
                <Expand
                  aria-hidden="true"
                  className="size-4 shrink-0 text-bone-200 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null ? (
        <Lightbox
          items={items}
          index={openIndex}
          onClose={close}
          onNavigate={go}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItemData[];
  index: number;
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => void;
}) {
  const item = items[index]!;
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Trava o scroll do body enquanto o lightbox está aberto, compensando a
  // largura da scrollbar para o conteúdo não "pular".
  React.useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, []);

  // Teclado: Esc fecha, setas navegam, Tab fica preso dentro do diálogo.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNavigate(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNavigate(-1);
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNavigate]);

  // Move o foco para o diálogo ao abrir.
  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} — ${item.style}`}
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-ink-950/97 backdrop-blur-sm animate-[ink-fade_.2s_ease-out] focus:outline-none"
    >
      {/* Barra superior */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-4 py-3 sm:px-6">
        <span className="overline text-ash-500 tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center border border-hairline text-bone-200 transition-colors hover:border-blood-500 hover:bg-blood-500 hover:text-bone-100"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Fechar galeria</span>
        </button>
      </div>

      {/* Imagem + navegação */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="absolute left-2 z-10 grid size-11 place-items-center border border-hairline bg-ink-950/70 text-bone-200 backdrop-blur-sm transition-colors hover:border-blood-500 hover:bg-blood-500 hover:text-bone-100 sm:left-6"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          <span className="sr-only">Trabalho anterior</span>
        </button>

        <div className="relative h-full w-full max-w-4xl">
          <Image
            key={item.id}
            src={item.imageUrl}
            alt={item.alt}
            fill
            sizes="(max-width: 1024px) 92vw, 900px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-contain animate-[ink-fade_.35s_ease-out]"
          />
        </div>

        <button
          type="button"
          onClick={() => onNavigate(1)}
          className="absolute right-2 z-10 grid size-11 place-items-center border border-hairline bg-ink-950/70 text-bone-200 backdrop-blur-sm transition-colors hover:border-blood-500 hover:bg-blood-500 hover:text-bone-100 sm:right-6"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
          <span className="sr-only">Próximo trabalho</span>
        </button>
      </div>

      {/* Ficha técnica */}
      <div className="shrink-0 border-t border-hairline bg-ink-900/60 px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl uppercase tracking-tight text-bone-100 sm:text-2xl">
              {item.title}
            </h2>
            {item.description ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ash-400">
                {item.description}
              </p>
            ) : null}
          </div>

          <dl className="flex shrink-0 gap-6 text-xs sm:text-right">
            <div>
              <dt className="overline text-ash-600">Estilo</dt>
              <dd className="mt-1.5 text-bone-200">{item.style}</dd>
            </div>
            {item.artistName ? (
              <div>
                <dt className="overline text-ash-600">Artista</dt>
                <dd className="mt-1.5 text-bone-200">{item.artistName}</dd>
              </div>
            ) : null}
            {item.bodyPart ? (
              <div>
                <dt className="overline text-ash-600">Local</dt>
                <dd className="mt-1.5 text-bone-200">{item.bodyPart}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}
