import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeader } from "@/components/site/section";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/site/social-icons";
import { Button } from "@/components/ui/button";
import { formattedAddress, siteConfig, whatsappLink } from "@/config/site";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com o Ink House: WhatsApp, telefone, e-mail e endereço na Vila Madalena, São Paulo. Horário de funcionamento e como chegar.",
  alternates: { canonical: "/contato" },
};

export const revalidate = 3600;

const faq = [
  {
    question: "Preciso pagar sinal para agendar?",
    answer:
      "O agendamento pelo site é uma solicitação: o estúdio confirma com você pelo WhatsApp e só então combina a reserva. Para projetos longos costumamos pedir um sinal, sempre abatido do valor final.",
  },
  {
    question: "Posso remarcar ou cancelar?",
    answer:
      "Pode, sem custo, com pelo menos 48 horas de antecedência. É só entrar em contato informando o número da sua reserva.",
  },
  {
    question: "Menor de idade pode tatuar?",
    answer:
      "Não tatuamos menores de 18 anos, mesmo com autorização dos responsáveis. É uma política do estúdio e não abrimos exceção.",
  },
  {
    question: "Vocês fazem orçamento por mensagem?",
    answer:
      "Damos uma estimativa por mensagem, mas o valor final depende de tamanho, local e complexidade — por isso a avaliação presencial ou a consultoria de projeto ajudam tanto.",
  },
];

export default function ContactPage() {
  const { contact, social } = siteConfig;

  // Mapa via OpenStreetMap: sem chave de API e sem cookie de rastreamento,
  // ao contrário do embed do Google Maps.
  const { latitude, longitude } = contact.address;
  const delta = 0.006;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta / 2}%2C${longitude + delta}%2C${latitude + delta / 2}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <>
      <PageHeader
        eyebrow="Contato"
        title="Vamos conversar"
        description="Tire suas dúvidas, peça uma estimativa ou marque uma visita ao estúdio. Respondemos rápido no WhatsApp."
      />

      <Section>
        <div className="container-editorial">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Canais */}
            <div className="lg:col-span-5">
              <SectionHeader
                eyebrow="Canais"
                title="Onde nos encontrar"
                size="sm"
              />

              <ul className="mt-8 space-y-3">
                <ContactRow
                  Icon={MessageCircle}
                  label="WhatsApp"
                  value={contact.phone}
                  href={whatsappLink()}
                  hint="Resposta em até algumas horas no horário comercial."
                  external
                />
                <ContactRow
                  Icon={Phone}
                  label="Telefone"
                  value={contact.phone}
                  href={`tel:+55${contact.whatsapp.replace(/^55/, "")}`}
                />
                <ContactRow
                  Icon={Mail}
                  label="E-mail"
                  value={contact.email}
                  href={`mailto:${contact.email}`}
                />
                <ContactRow
                  Icon={MapPin}
                  label="Endereço"
                  value={formattedAddress()}
                  hint={`CEP ${contact.address.zip}`}
                />
              </ul>

              {/* Redes */}
              <div className="mt-10">
                <h2 className="overline text-ash-500">Redes sociais</h2>
                <ul className="mt-4 flex gap-3">
                  {[
                    { label: "Instagram", href: social.instagram, Icon: InstagramIcon },
                    { label: "Facebook", href: social.facebook, Icon: FacebookIcon },
                    { label: "TikTok", href: social.tiktok, Icon: TikTokIcon },
                  ].map(({ label, href, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${siteConfig.studioName} no ${label}`}
                        className="grid size-11 place-items-center border border-hairline text-ash-400 transition-colors hover:border-blood-500 hover:bg-blood-500 hover:text-bone-100"
                      >
                        <Icon className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Horário */}
              <div className="mt-10">
                <h2 className="overline text-ash-500">Funcionamento</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {siteConfig.openingHours.map((entry) => (
                    <li
                      key={entry.label}
                      className="flex items-baseline justify-between gap-4 border-b border-hairline pb-3"
                    >
                      <span className="text-bone-200">{entry.label}</span>
                      <span className="text-ash-500">{entry.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button asChild size="lg" className="mt-10 w-full sm:w-auto">
                <Link href="/agendamento">
                  Agendar horário
                  <CalendarDays aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {/* Mapa */}
            <Reveal className="lg:col-span-7">
              <div className="surface overflow-hidden">
                <iframe
                  src={mapSrc}
                  title={`Mapa mostrando a localização do ${siteConfig.studioName} em ${contact.address.city}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-96 w-full border-0 grayscale contrast-125 lg:h-[32rem]"
                />
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline p-5">
                  <address className="not-italic text-sm text-bone-200">
                    {formattedAddress()}
                  </address>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-blood-400 underline underline-offset-4 hover:text-blood-300"
                  >
                    Abrir no mapa
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Perguntas frequentes */}
      <Section className="border-t border-hairline bg-ink-900/40">
        <div className="container-editorial">
          <SectionHeader
            eyebrow="Dúvidas frequentes"
            title="Antes de agendar"
            align="center"
          />

          <dl className="mx-auto mt-12 max-w-3xl divide-y divide-hairline border-y border-hairline">
            {/* O <div> do Reveal é o próprio agrupador do par dt/dd: dentro de
                um <dl> só vale um nível de <div>, e aninhar dois invalida a
                lista de definição para leitores de tela. */}
            {faq.map((item, index) => (
              <Reveal key={item.question} delay={index * 70} className="py-6">
                <dt className="text-sm font-bold uppercase tracking-[0.08em] text-bone-100">
                  {item.question}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-ash-400">
                  {item.answer}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </Section>
    </>
  );
}

function ContactRow({
  Icon,
  label,
  value,
  href,
  hint,
  external,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  href?: string;
  hint?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center border border-hairline text-blood-500 transition-colors group-hover:border-blood-500 group-hover:bg-blood-500 group-hover:text-bone-100">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="overline block text-ash-600">{label}</span>
        <span className="mt-1.5 block break-words text-sm text-bone-100">{value}</span>
        {hint ? (
          <span className="mt-1 block text-xs text-ash-600">{hint}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="group flex gap-4 border border-hairline bg-ink-900 p-5 transition-colors hover:border-hairline-strong"
        >
          {content}
        </a>
      ) : (
        <div className="group flex gap-4 border border-hairline bg-ink-900 p-5">
          {content}
        </div>
      )}
    </li>
  );
}
