import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Syringe,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { FinalCta } from "@/components/site/final-cta";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeader } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { BLUR_DATA_URL, studioImages } from "@/config/images";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Sobre o estúdio",
  description:
    "Conheça o Ink House: processo autoral, protocolo de biossegurança, artistas especializados e acompanhamento de cicatrização do começo ao fim.",
  alternates: { canonical: "/sobre" },
};

export const revalidate = 3600;

const values = [
  {
    Icon: Sparkles,
    title: "Autoral por princípio",
    text: "Não reproduzimos desenho de catálogo. Todo projeto é desenvolvido a partir da sua história, do seu corpo e do estilo do artista.",
  },
  {
    Icon: ShieldCheck,
    title: "Biossegurança sem atalho",
    text: "Agulhas e biqueiras descartáveis abertas na sua frente, superfícies barreiradas e autoclave com controle de ciclo registrado.",
  },
  {
    Icon: HeartHandshake,
    title: "Atendimento sem pressa",
    text: "Consulta antes da agulha, explicação de cada etapa e liberdade total para ajustar o projeto até você se sentir seguro.",
  },
  {
    Icon: Syringe,
    title: "Cicatrização acompanhada",
    text: "Orientação por escrito no fim da sessão, canal aberto para dúvidas e retoque gratuito nos primeiros noventa dias.",
  },
  {
    Icon: Users,
    title: "Ambiente para todos",
    text: "Espaço acolhedor, sem julgamento e com privacidade para quem precisa. Primeira tatuagem é levada tão a sério quanto um fechamento.",
  },
  {
    Icon: Award,
    title: "Técnica em evolução",
    text: "Os artistas participam de convenções e formações continuamente. Técnica que não evolui vira limite para o seu projeto.",
  },
];

const timeline = [
  {
    year: "2014",
    title: "O começo",
    text: "Duas cadeiras, uma sala emprestada na Vila Madalena e a decisão de só fazer trabalho autoral.",
  },
  {
    year: "2018",
    title: "Estúdio próprio",
    text: "Mudança para o espaço atual, com sala de esterilização separada e três estações de trabalho.",
  },
  {
    year: "2022",
    title: "Formação de equipe",
    text: "Programa interno de aperfeiçoamento e chegada dos artistas de fine line e oriental.",
  },
  {
    year: "Hoje",
    title: "Cinco artistas",
    text: "Um elenco que cobre do realismo ao blackwork, com agenda aberta e projeto acompanhado de ponta a ponta.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sobre o estúdio"
        title={
          <>
            Mais que tatuagens,
            <br />
            criamos conexões.
          </>
        }
        description="Somos um estúdio de tatuagem autoral em São Paulo. Trabalhamos com projeto exclusivo, protocolo rígido de segurança e um atendimento que começa muito antes da primeira agulha."
      />

      {/* Manifesto + fotografia */}
      <Section spacing="lg">
        <div className="container-editorial">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-6">
              <div className="relative aspect-4/3 w-full lg:aspect-4/5">
                <Image
                  src={studioImages.interior.src}
                  alt={studioImages.interior.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover"
                />
              </div>
            </Reveal>

            <div className="lg:col-span-6">
              <SectionHeader
                eyebrow="Nosso jeito"
                title="Cada traço carrega significado."
                size="sm"
              />

              <div className="mt-8 space-y-5 text-base leading-relaxed text-ash-300">
                <p>
                  Tatuar é uma decisão permanente, e a gente trata como tal. O
                  processo começa com uma conversa: o que você quer contar, onde
                  no corpo, quanto tempo tem, quanto pode investir. Só depois
                  disso o desenho começa.
                </p>
                <p>
                  Isso significa às vezes dizer que uma ideia não vai funcionar
                  do jeito imaginado — e propor um caminho melhor. Preferimos
                  uma conversa honesta agora do que um arrependimento depois.
                </p>
                <p>
                  O resultado é um estúdio onde as pessoas voltam. Muitos dos
                  nossos projetos de fechamento começaram como uma peça pequena
                  de alguém que estava com medo de tatuar.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/agendamento">
                    Agendar uma conversa
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/artistas">Conhecer os artistas</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Valores */}
      <Section className="border-t border-hairline bg-ink-900/40">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Como trabalhamos"
            title="Seis compromissos"
            description="Não são slogans de parede. São as regras que orientam cada atendimento aqui dentro."
            align="center"
          />

          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <Reveal as="li" key={value.title} delay={index * 80}>
                <div className="surface h-full p-6 transition-colors duration-500 hover:border-hairline-strong">
                  <span className="inline-grid size-11 place-items-center border border-hairline text-blood-500">
                    <value.Icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-bone-100">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ash-400">
                    {value.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Linha do tempo */}
      <Section className="border-t border-hairline">
        <div className="container-editorial">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeader
                eyebrow="Nossa história"
                title="Doze anos de estúdio"
                description="Começamos pequenos e crescemos sem abrir mão do que nos trouxe até aqui."
                size="sm"
              />

              <Reveal delay={120} className="mt-10">
                <div className="relative aspect-3/2 w-full">
                  <Image
                    src={studioImages.workstation.src}
                    alt={studioImages.workstation.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 38vw"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover"
                  />
                </div>
              </Reveal>
            </div>

            <ol className="lg:col-span-6 lg:col-start-7">
              {timeline.map((entry, index) => (
                <Reveal as="li" key={entry.year} delay={index * 100}>
                  <div className="relative border-l border-hairline pb-10 pl-8 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[5px] top-1.5 size-2.5 bg-blood-500"
                    />
                    <span className="font-display text-3xl text-blood-500">
                      {entry.year}
                    </span>
                    <h3 className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-bone-100">
                      {entry.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ash-400">
                      {entry.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* Onde estamos */}
      <Section className="border-t border-hairline bg-ink-900/40" spacing="sm">
        <div className="container-editorial">
          <div className="grid gap-8 sm:grid-cols-3">
            <Reveal>
              <h2 className="overline text-ash-500">Endereço</h2>
              <address className="mt-4 not-italic text-sm leading-relaxed text-bone-200">
                {siteConfig.contact.address.street}
                <br />
                {siteConfig.contact.address.district}
                <br />
                {siteConfig.contact.address.city} / {siteConfig.contact.address.state}
                <br />
                CEP {siteConfig.contact.address.zip}
              </address>
            </Reveal>

            <Reveal delay={90}>
              <h2 className="overline text-ash-500">Funcionamento</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {siteConfig.openingHours.map((entry) => (
                  <li key={entry.label}>
                    <span className="block text-bone-200">{entry.label}</span>
                    <span className="text-ash-500">{entry.hours}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={180}>
              <h2 className="overline text-ash-500">Contato</h2>
              <ul className="mt-4 space-y-3 text-sm text-bone-200">
                <li>{siteConfig.contact.phone}</li>
                <li className="break-all">{siteConfig.contact.email}</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-6">
                <Link href="/contato">Ver mapa e contato</Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
