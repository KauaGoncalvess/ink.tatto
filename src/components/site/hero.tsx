import Image from "next/image";
import Link from "next/link";
import { ArrowDown, CalendarDays, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/site/section";
import { BLUR_DATA_URL, heroImages } from "@/config/images";
import { cn } from "@/lib/utils";

/**
 * Hero.
 *
 * Layout editorial assimétrico: a fotografia ocupa a coluna esquerda em toda a
 * altura e o texto respira na direita. No mobile a ordem inverte para
 * imagem → texto → CTAs, como pedido, com a imagem em proporção mais baixa
 * para não empurrar os botões para fora da primeira tela.
 */

type Stat = { value: string; label: string };

const stats: Stat[] = [
  { value: "12", label: "anos de estúdio" },
  { value: "5", label: "artistas autorais" },
  { value: "4k+", label: "sessões realizadas" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-950" aria-labelledby="hero-title">
      {/* Vinheta radial de fundo — dá profundidade sem custo de imagem. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(200,16,46,0.07),transparent_60%)]"
      />

      <div className="container-editorial relative">
        <div className="grid items-center gap-10 pb-16 pt-28 md:pb-20 md:pt-32 lg:grid-cols-12 lg:gap-14 lg:pb-28 lg:pt-40">
          {/* Fotografia */}
          <figure
            className={cn(
              "relative order-1 lg:order-none lg:col-span-6 xl:col-span-5",
              "aspect-4/3 sm:aspect-16/10 lg:aspect-3/4",
            )}
          >
            <Image
              src={heroImages.main.src}
              alt={heroImages.main.alt}
              fill
              priority
              // Única imagem com priority na página inteira: é o LCP.
              sizes="(max-width: 1024px) 100vw, 42vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
            {/* Overlay para garantir contraste sobre qualquer fotografia
                que venha a substituir o placeholder. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-ink-950/10 lg:to-ink-950/70"
            />

            {/* Moldura em fio, deslocada — detalhe gráfico editorial. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-3 hidden h-full w-full border border-hairline lg:block"
            />
          </figure>

          {/* Conteúdo */}
          <div className="order-2 lg:order-none lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7">
            <Eyebrow className="animate-[ink-fade_.6s_ease-out_both]">
              Arte na pele
            </Eyebrow>

            {/* As quebras são explícitas para o título cair sempre em três
                linhas equilibradas. Sem elas, "TRANSFORME SUA" não cabe na
                coluna nos tamanhos grandes e a composição desmonta. */}
            <h1
              id="hero-title"
              className="display-title mt-6 text-[clamp(2.5rem,7.5vw,5.5rem)] animate-[ink-fade-up_.9s_var(--ease-out-expo)_.1s_both]"
            >
              Transforme
              <br />
              sua <span className="text-blood-500">história</span>
              <br />
              em arte.
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed text-ash-300 text-pretty animate-[ink-fade-up_.9s_var(--ease-out-expo)_.25s_both] md:text-lg">
              Tatuagens autorais, técnica precisa e artistas especializados para
              transformar suas ideias em algo permanente.
            </p>

            <div className="mt-10 flex flex-col gap-3 animate-[ink-fade-up_.9s_var(--ease-out-expo)_.4s_both] sm:flex-row sm:items-center">
              <Button asChild size="lg" className="sm:w-auto">
                <Link href="/agendamento">
                  Agendar horário
                  <CalendarDays aria-hidden="true" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline">
                <Link href="/galeria">
                  Ver galeria
                  <LayoutGrid aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {/* Prova social discreta */}
            <dl className="mt-12 grid grid-cols-3 gap-x-6 gap-y-4 border-t border-hairline pt-8 animate-[ink-fade-up_.9s_var(--ease-out-expo)_.55s_both] sm:max-w-lg">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-3xl text-bone-100 md:text-4xl">
                      {stat.value}
                    </span>
                    {/* tracking menor que o padrão: com 0.14em o rótulo de três
                        palavras estoura a coluna em telas estreitas. */}
                    <span className="mt-2 block text-[0.625rem] uppercase leading-snug tracking-[0.1em] text-ash-500">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Indicador de scroll — some assim que a página rola. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="overline text-ash-600">Role</span>
        <ArrowDown className="size-4 animate-[ink-scroll-hint_2.4s_ease-in-out_infinite] text-blood-500" />
      </div>
    </section>
  );
}
