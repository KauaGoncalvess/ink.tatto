"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  MessageCircle,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { ServiceIcon } from "@/components/site/service-icon";
import { BookingCalendar } from "@/features/booking/components/booking-calendar";
import { createAppointment } from "@/features/booking/actions";
import {
  useAvailableDays,
  useAvailableSlots,
} from "@/features/booking/use-availability";
import { clientDetailsSchema } from "@/schemas/booking";
import { BLUR_DATA_URL, FALLBACK_IMAGE } from "@/config/images";
import { whatsappLink } from "@/config/site";
import { addDaysISO, formatLongDate, todayISO } from "@/lib/datetime";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";

/**
 * Wizard de agendamento.
 *
 * O estado vive na URL (?servico&artista&data&horario&passo). Três ganhos
 * concretos: o botão voltar do navegador funciona, o passo é compartilhável, e
 * o card do artista consegue linkar direto para cá com o artista escolhido —
 * sem contexto global nem estado duplicado.
 *
 * A confirmação é o único estado local, porque só existe depois da resposta do
 * servidor e não deve sobreviver a um refresh.
 */

export type WizardService = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  durationMin: number;
  bufferMin: number;
  priceFrom: number;
  icon: string;
};

export type WizardArtist = {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  shortBio: string;
  avatarUrl: string | null;
  specialties: string[];
  serviceIds: string[];
};

type Props = {
  services: WizardService[];
  artists: WizardArtist[];
  minLeadTimeHours: number;
  maxAdvanceDays: number;
};

const STEPS = [
  { key: "servico", label: "Serviço" },
  { key: "artista", label: "Artista" },
  { key: "data", label: "Data e horário" },
  { key: "dados", label: "Seus dados" },
  { key: "resumo", label: "Confirmação" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type Confirmation = {
  code: string;
  startsAt: string;
  artistName: string;
  serviceName: string;
};

type ClientDetails = {
  name: string;
  phone: string;
  email: string;
  referenceNotes: string;
  referenceImage: string;
};

const EMPTY_DETAILS: ClientDetails = {
  name: "",
  phone: "",
  email: "",
  referenceNotes: "",
  referenceImage: "",
};

export function BookingWizard({
  services,
  artists,
  minLeadTimeHours,
  maxAdvanceDays,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const serviceId = params.get("servico") ?? "";
  const artistId = params.get("artista") ?? "";
  const dateISO = params.get("data") ?? "";
  const time = params.get("horario") ?? "";
  const stepParam = params.get("passo") as StepKey | null;

  const [details, setDetails] = React.useState<ClientDetails>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);

  const service = services.find((entry) => entry.id === serviceId) ?? null;
  const artist = artists.find((entry) => entry.id === artistId) ?? null;

  /** Atualiza a URL preservando os demais parâmetros. */
  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const search = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") search.delete(key);
        else search.set(key, value);
      }
      router.push(`/agendamento?${search}`, { scroll: false });
    },
    [params, router],
  );

  // Passo efetivo: respeita o parâmetro, mas nunca deixa o usuário num passo
  // à frente do que já foi preenchido (ex.: link colado pela metade).
  const step: StepKey = React.useMemo(() => {
    // Pré-requisitos primeiro: o passo pedido na URL só vale se os dados
    // anteriores existirem.
    if (!service) return "servico";
    if (!artist) return "artista";
    if (!dateISO || !time) return "data";
    // Com serviço, artista, data e horário definidos, restam apenas os dois
    // últimos passos; qualquer outro valor cai em "dados".
    return stepParam === "resumo" ? "resumo" : "dados";
  }, [service, artist, dateISO, time, stepParam]);

  const stepIndex = STEPS.findIndex((entry) => entry.key === step);

  // Artistas compatíveis com o serviço escolhido.
  const eligibleArtists = React.useMemo(
    () =>
      serviceId
        ? artists.filter((entry) => entry.serviceIds.includes(serviceId))
        : artists,
    [artists, serviceId],
  );

  // Se um link trouxe artista sem serviço, pré-seleciona o serviço quando o
  // artista só executa um — economiza um passo sem esconder opções.
  React.useEffect(() => {
    if (!artistId || serviceId) return;
    const selected = artists.find((entry) => entry.id === artistId);
    if (selected?.serviceIds.length === 1) {
      setParams({ servico: selected.serviceIds[0]!, passo: "data" });
    }
  }, [artistId, serviceId, artists, setParams]);

  if (confirmation && service && artist) {
    return (
      <ConfirmationPanel
        confirmation={confirmation}
        onRestart={() => {
          setConfirmation(null);
          setDetails(EMPTY_DETAILS);
          router.push("/agendamento");
        }}
      />
    );
  }

  const today = todayISO();
  const minDateISO = addDaysISO(today, Math.floor(minLeadTimeHours / 24));
  const maxDateISO = addDaysISO(today, maxAdvanceDays);

  async function handleSubmit() {
    if (!service || !artist) return;

    setFormError(null);
    setFieldErrors({});

    // Validação no cliente é só UX — a Server Action revalida tudo.
    const parsed = clientDetailsSchema.safeParse({
      name: details.name,
      phone: details.phone,
      email: details.email,
      referenceNotes: details.referenceNotes,
      referenceImage: details.referenceImage,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      setParams({ passo: "dados" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAppointment({
        serviceId: service.id,
        artistId: artist.id,
        dateISO,
        time,
        ...parsed.data,
      });

      if (result.ok) {
        setConfirmation(result.appointment);
        return;
      }

      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setParams({ passo: "dados" });
      }
      // Horário perdido para outra pessoa: devolve ao passo de data para
      // escolher outro, em vez de deixar o usuário travado no resumo.
      if (/horário/i.test(result.error)) {
        setParams({ horario: null, passo: "data" });
      }
    } catch {
      setFormError(
        "Não conseguimos falar com o servidor. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Coluna principal */}
      <div className="lg:col-span-8">
        <StepIndicator current={stepIndex} />

        <div className="mt-10">
          {step === "servico" ? (
            <StepService
              services={services}
              onSelect={(id) => setParams({ servico: id, artista: null, horario: null, passo: "artista" })}
            />
          ) : null}

          {step === "artista" ? (
            <StepArtist
              artists={eligibleArtists}
              onSelect={(id) => setParams({ artista: id, horario: null, passo: "data" })}
              onBack={() => setParams({ servico: null, passo: "servico" })}
            />
          ) : null}

          {step === "data" && service && artist ? (
            <StepDateTime
              service={service}
              artistId={artist.id}
              dateISO={dateISO}
              time={time}
              minDateISO={minDateISO}
              maxDateISO={maxDateISO}
              onDateChange={(next) => setParams({ data: next, horario: null })}
              onTimeChange={(next) => setParams({ horario: next, passo: "dados" })}
              onBack={() => setParams({ artista: null, passo: "artista" })}
            />
          ) : null}

          {step === "dados" ? (
            <StepDetails
              details={details}
              errors={fieldErrors}
              onChange={(patch) => setDetails((current) => ({ ...current, ...patch }))}
              onBack={() => setParams({ horario: null, passo: "data" })}
              onNext={() => {
                const parsed = clientDetailsSchema.safeParse(details);
                if (!parsed.success) {
                  const errors: Record<string, string> = {};
                  for (const issue of parsed.error.issues) {
                    errors[issue.path.join(".")] ??= issue.message;
                  }
                  setFieldErrors(errors);
                  return;
                }
                setFieldErrors({});
                setParams({ passo: "resumo" });
              }}
            />
          ) : null}

          {step === "resumo" && service && artist ? (
            <StepSummary
              service={service}
              artist={artist}
              dateISO={dateISO}
              time={time}
              details={details}
              error={formError}
              submitting={submitting}
              onBack={() => setParams({ passo: "dados" })}
              onConfirm={handleSubmit}
            />
          ) : null}
        </div>
      </div>

      {/* Resumo lateral, sempre visível */}
      <aside className="lg:col-span-4">
        <div className="surface sticky top-28 p-6">
          <h2 className="overline text-ash-400">Seu agendamento</h2>

          <dl className="mt-6 space-y-5 text-sm">
            <SummaryRow
              icon={<ServiceIcon name={service?.icon ?? "Sparkles"} className="size-4" />}
              label="Serviço"
              value={service?.name}
            />
            <SummaryRow
              icon={<User className="size-4" aria-hidden="true" />}
              label="Artista"
              value={artist?.name}
            />
            <SummaryRow
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label="Data"
              value={
                dateISO
                  ? formatLongDate(new Date(`${dateISO}T12:00:00Z`))
                  : undefined
              }
              capitalize
            />
            <SummaryRow
              icon={<Clock className="size-4" aria-hidden="true" />}
              label="Horário"
              value={time || undefined}
            />
          </dl>

          {service ? (
            <div className="mt-6 space-y-2 border-t border-hairline pt-5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ash-500">Duração</span>
                <span className="text-bone-200">
                  {formatDuration(service.durationMin)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ash-500">Valor inicial</span>
                <span className="font-semibold text-bone-100">
                  {service.priceFrom > 0
                    ? formatCurrency(service.priceFrom)
                    : "Sem custo"}
                </span>
              </div>
              <p className="pt-2 text-xs leading-relaxed text-ash-600">
                O valor final é confirmado pelo artista após avaliar tamanho,
                local e complexidade do projeto.
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passos
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3" aria-label="Etapas do agendamento">
      {STEPS.map((entry, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "grid size-7 shrink-0 place-items-center border text-[0.625rem] font-bold tabular-nums transition-colors",
                active
                  ? "border-blood-500 bg-blood-500 text-bone-100"
                  : done
                    ? "border-blood-700 bg-blood-700/20 text-blood-400"
                    : "border-hairline text-ash-600",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>

            <span
              className={cn(
                "text-[0.6875rem] font-semibold uppercase tracking-[0.12em] transition-colors",
                active ? "text-bone-100" : done ? "text-ash-400" : "text-ash-600",
              )}
            >
              {entry.label}
            </span>

            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="mx-1 hidden h-px w-6 bg-hairline sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <span className="overline text-blood-400">{step}</span>
      <h2 className="display-title mt-3 text-[clamp(1.5rem,3.5vw,2.5rem)]">{title}</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ash-400">{description}</p>
    </div>
  );
}

function StepService({
  services,
  onSelect,
}: {
  services: WizardService[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <StepHeading
        step="Passo 1"
        title="Escolha o serviço"
        description="Selecione o que você quer fazer. Isso define a duração da sessão e quais artistas atendem."
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onSelect(service.id)}
              className="group flex h-full w-full flex-col border border-hairline bg-ink-900 p-5 text-left transition-colors hover:border-blood-500 hover:bg-ink-850"
            >
              <span className="inline-grid size-10 place-items-center border border-hairline text-blood-500 transition-colors group-hover:border-blood-500 group-hover:bg-blood-500 group-hover:text-bone-100">
                <ServiceIcon name={service.icon} className="size-4" />
              </span>

              <span className="mt-4 block text-sm font-bold uppercase tracking-[0.08em] text-bone-100">
                {service.name}
              </span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-ash-400">
                {service.shortDescription}
              </span>

              <span className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3 text-xs text-ash-500">
                <span>{formatDuration(service.durationMin)}</span>
                <span className="font-semibold text-bone-200">
                  {service.priceFrom > 0
                    ? `a partir de ${formatCurrency(service.priceFrom)}`
                    : "Sem custo"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepArtist({
  artists,
  onSelect,
  onBack,
}: {
  artists: WizardArtist[];
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeading
        step="Passo 2"
        title="Escolha o artista"
        description="Estes são os artistas que executam o serviço selecionado."
      />

      {artists.length === 0 ? (
        <EmptyState
          title="Nenhum artista disponível"
          description="Nenhum artista está aceitando este serviço no momento. Fale com o estúdio pelo WhatsApp e a gente resolve."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {artists.map((artist) => (
            <li key={artist.id}>
              <button
                type="button"
                onClick={() => onSelect(artist.id)}
                className="group flex h-full w-full gap-4 border border-hairline bg-ink-900 p-4 text-left transition-colors hover:border-blood-500 hover:bg-ink-850"
              >
                <span className="relative size-20 shrink-0 overflow-hidden bg-ink-700">
                  <Image
                    src={artist.avatarUrl ?? FALLBACK_IMAGE}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="80px"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold uppercase tracking-[0.08em] text-bone-100">
                    {artist.name}
                  </span>
                  {artist.handle ? (
                    <span className="mt-0.5 block text-[0.625rem] uppercase tracking-[0.16em] text-blood-400">
                      {artist.handle}
                    </span>
                  ) : null}
                  <span className="mt-2 block text-xs leading-relaxed text-ash-400">
                    {artist.specialties.join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Trocar serviço
        </Button>
      </div>
    </div>
  );
}

function StepDateTime({
  service,
  artistId,
  dateISO,
  time,
  minDateISO,
  maxDateISO,
  onDateChange,
  onTimeChange,
  onBack,
}: {
  service: WizardService;
  artistId: string;
  dateISO: string;
  time: string;
  minDateISO: string;
  maxDateISO: string;
  onDateChange: (dateISO: string) => void;
  onTimeChange: (time: string) => void;
  onBack: () => void;
}) {
  // Dias com vaga em toda a janela de agendamento (para o calendário) e
  // horários do dia escolhido. Ambos via hook: cancelamento, respostas fora de
  // ordem e estado de carregamento já resolvidos.
  const availableDays = useAvailableDays({
    artistId,
    serviceId: service.id,
    fromISO: minDateISO,
    toISO: maxDateISO,
  });

  const availability = useAvailableSlots({ artistId, serviceId: service.id, dateISO });
  const { slots } = availability;

  return (
    <div>
      <StepHeading
        step="Passo 3"
        title="Data e horário"
        description={`A sessão dura cerca de ${formatDuration(service.durationMin)}. Só aparecem horários que cabem inteiros na agenda do artista.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BookingCalendar
          value={dateISO || null}
          onChange={onDateChange}
          availableDays={availableDays}
          minDateISO={minDateISO}
          maxDateISO={maxDateISO}
          isLoading={availableDays === null}
        />

        <div className="surface p-4 sm:p-6">
          <h3 className="overline text-ash-400">Horários disponíveis</h3>

          <div className="mt-5 min-h-40" role="status" aria-live="polite">
            {!dateISO ? (
              <p className="text-sm text-ash-500">
                Escolha uma data no calendário para ver os horários.
              </p>
            ) : availability.isLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {Array.from({ length: 9 }, (_, index) => (
                  <div key={index} className="skeleton h-11" />
                ))}
                <span className="sr-only">Carregando horários…</span>
              </div>
            ) : slots.length === 0 ? (
              <div>
                <p className="text-sm text-ash-400">{availability.reason}</p>
                <p className="mt-3 text-xs text-ash-600">
                  Tente outra data no calendário ou{" "}
                  <a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blood-400 underline underline-offset-4 hover:text-blood-300"
                  >
                    fale com o estúdio
                  </a>
                  .
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {slots.map((slot) => (
                  <li key={slot.time}>
                    <button
                      type="button"
                      onClick={() => onTimeChange(slot.time)}
                      aria-pressed={time === slot.time}
                      className={cn(
                        "h-11 w-full border text-sm tabular-nums transition-colors",
                        time === slot.time
                          ? "border-blood-500 bg-blood-500 font-semibold text-bone-100"
                          : "border-hairline text-bone-200 hover:border-blood-500 hover:bg-ink-800",
                      )}
                    >
                      {slot.time}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Trocar artista
        </Button>
      </div>
    </div>
  );
}

function StepDetails({
  details,
  errors,
  onChange,
  onBack,
  onNext,
}: {
  details: ClientDetails;
  errors: Record<string, string>;
  onChange: (patch: Partial<ClientDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const returning = useReturningClient(details.phone);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { path?: string; error?: string };

      if (!response.ok || !data.path) {
        setUploadError(data.error ?? "Não foi possível enviar a imagem.");
        return;
      }
      onChange({ referenceImage: data.path });
    } catch {
      setUploadError("Falha no envio. Verifique sua conexão e tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <StepHeading
        step="Passo 4"
        title="Seus dados"
        description="Precisamos do seu contato para confirmar o horário. Quanto mais detalhe você der sobre a ideia, melhor o artista se prepara."
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onNext();
        }}
        noValidate
        className="space-y-6"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <Label htmlFor="bk-name" required>
              Nome completo
            </Label>
            <Input
              id="bk-name"
              value={details.name}
              onChange={(event) => onChange({ name: event.target.value })}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "bk-name-error" : undefined}
              placeholder="Como podemos te chamar"
            />
            <FieldError id="bk-name-error">{errors.name}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="bk-phone" required>
              Telefone / WhatsApp
            </Label>
            <Input
              id="bk-phone"
              type="tel"
              inputMode="tel"
              value={details.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "bk-phone-error" : "bk-phone-hint"}
              placeholder="(11) 98765-4321"
            />
            <FieldError id="bk-phone-error">{errors.phone}</FieldError>
            {!errors.phone ? (
              <FieldHint id="bk-phone-hint">
                {returning
                  ? `Que bom te ver de novo, ${returning.firstName}!`
                  : "É por aqui que o estúdio confirma seu horário."}
              </FieldHint>
            ) : null}
          </Field>
        </div>

        <Field>
          <Label htmlFor="bk-email">E-mail</Label>
          <Input
            id="bk-email"
            type="email"
            value={details.email}
            onChange={(event) => onChange({ email: event.target.value })}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "bk-email-error" : undefined}
            placeholder="voce@email.com"
          />
          <FieldError id="bk-email-error">{errors.email}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="bk-notes">Sobre a sua ideia</Label>
          <Textarea
            id="bk-notes"
            value={details.referenceNotes}
            onChange={(event) => onChange({ referenceNotes: event.target.value })}
            maxLength={1000}
            aria-invalid={Boolean(errors.referenceNotes)}
            aria-describedby="bk-notes-hint"
            placeholder="Tema, tamanho aproximado, local do corpo, estilo que você gosta…"
          />
          <FieldHint id="bk-notes-hint">
            {details.referenceNotes.length}/1000 caracteres
          </FieldHint>
        </Field>

        {/* Upload de referência */}
        <Field>
          <Label htmlFor="bk-reference">Imagem de referência (opcional)</Label>

          {details.referenceImage ? (
            <div className="flex items-center gap-4 border border-hairline bg-ink-850 p-3">
              <span className="relative size-16 shrink-0 overflow-hidden bg-ink-700">
                <Image
                  src={details.referenceImage}
                  alt="Pré-visualização da imagem de referência enviada"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1 text-xs text-ash-400">
                Imagem enviada com sucesso.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ referenceImage: "" })}
              >
                <Trash2 aria-hidden="true" />
                Remover
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={inputRef}
                id="bk-reference"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-3 border border-dashed border-hairline-strong bg-ink-850 px-4 py-8 text-sm text-ash-400 transition-colors hover:border-blood-500 hover:text-bone-200 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="size-4" aria-hidden="true" />
                )}
                {uploading ? "Enviando…" : "Enviar uma imagem de referência"}
              </button>
              <FieldHint>JPG, PNG ou WEBP até 5 MB.</FieldHint>
            </div>
          )}

          <FieldError>{uploadError}</FieldError>
        </Field>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Trocar horário
          </Button>

          <Button type="submit" size="lg">
            Revisar agendamento
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepSummary({
  service,
  artist,
  dateISO,
  time,
  details,
  error,
  submitting,
  onBack,
  onConfirm,
}: {
  service: WizardService;
  artist: WizardArtist;
  dateISO: string;
  time: string;
  details: ClientDetails;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <StepHeading
        step="Passo 5"
        title="Confira e confirme"
        description="Revise os dados abaixo. Depois de confirmar, o estúdio recebe a solicitação e retorna para você."
      />

      <dl className="surface divide-y divide-hairline">
        <SummaryLine label="Serviço" value={service.name} />
        <SummaryLine label="Artista" value={artist.name} />
        <SummaryLine
          label="Data"
          value={formatLongDate(new Date(`${dateISO}T12:00:00Z`))}
          capitalize
        />
        <SummaryLine label="Horário" value={time} />
        <SummaryLine label="Duração estimada" value={formatDuration(service.durationMin)} />
        <SummaryLine
          label="Valor inicial"
          value={service.priceFrom > 0 ? formatCurrency(service.priceFrom) : "Sem custo"}
        />
        <SummaryLine label="Nome" value={details.name} />
        <SummaryLine label="Telefone" value={details.phone} />
        {details.email ? <SummaryLine label="E-mail" value={details.email} /> : null}
        {details.referenceNotes ? (
          <SummaryLine label="Sua ideia" value={details.referenceNotes} />
        ) : null}
      </dl>

      {error ? (
        <p
          role="alert"
          className="mt-6 border border-blood-700 bg-blood-700/10 px-4 py-3 text-sm text-blood-400"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={submitting}>
          <ArrowLeft aria-hidden="true" />
          Editar dados
        </Button>

        <Button
          type="button"
          size="lg"
          onClick={onConfirm}
          isLoading={submitting}
          loadingText="Confirmando seu agendamento"
        >
          Confirmar agendamento
          <Check aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ConfirmationPanel({
  confirmation,
  onRestart,
}: {
  confirmation: Confirmation;
  onRestart: () => void;
}) {
  const startsAt = new Date(confirmation.startsAt);

  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mx-auto grid size-16 place-items-center border border-status-confirmed/40 bg-status-confirmed/10 text-status-confirmed">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </span>

      <h2 className="display-title mt-8 text-[clamp(1.75rem,5vw,3.25rem)]">
        Agendamento solicitado
      </h2>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ash-400">
        Seu horário foi enviado para o estúdio. Em breve entramos em contato
        pelo WhatsApp para confirmar. Guarde o número da sua reserva.
      </p>

      <div className="surface-raised mt-10 p-6 text-left sm:p-8">
        <div className="border-b border-hairline pb-5 text-center">
          <span className="overline text-ash-500">Número da reserva</span>
          <p className="mt-2 font-display text-3xl tracking-wide text-blood-500">
            {confirmation.code}
          </p>
        </div>

        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ash-500">Artista</dt>
            <dd className="text-right text-bone-100">{confirmation.artistName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ash-500">Serviço</dt>
            <dd className="text-right text-bone-100">{confirmation.serviceName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ash-500">Data</dt>
            <dd className="text-right capitalize text-bone-100">
              {formatLongDate(startsAt)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ash-500">Horário</dt>
            <dd className="text-right tabular-nums text-bone-100">
              {new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              }).format(startsAt)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <a
            href={whatsappLink(
              `Olá! Acabei de solicitar um agendamento (reserva ${confirmation.code}).`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp
            <MessageCircle aria-hidden="true" />
          </a>
        </Button>

        <Button variant="outline" size="lg" onClick={onRestart}>
          Fazer outro agendamento
        </Button>
      </div>

      <p className="mt-8 text-xs text-ash-600">
        Precisa remarcar ou cancelar?{" "}
        <Link href="/contato" className="text-blood-400 underline underline-offset-4">
          Entre em contato
        </Link>{" "}
        informando o número da reserva.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function SummaryRow({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  capitalize?: boolean;
}) {
  // O ícone vive dentro do <dt>: um <span> solto entre <dt> e <dd> quebraria
  // o agrupamento da lista de definição. O <dd> se alinha ao rótulo com um
  // recuo igual à largura do ícone (size-4) mais o gap.
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-3 text-[0.625rem] uppercase tracking-[0.16em] text-ash-600">
        <span className="shrink-0 text-blood-500" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 break-words pl-7 text-sm",
          value ? "text-bone-100" : "text-ash-600",
          capitalize && "first-letter:uppercase",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-[0.6875rem] uppercase tracking-[0.14em] text-ash-500">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-bone-100 sm:max-w-sm sm:text-right",
          capitalize && "first-letter:uppercase",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface p-8 text-center">
      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-bone-100">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ash-400">
        {description}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-6">
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
          Falar no WhatsApp
          <MessageCircle aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}

/**
 * Reconhece um cliente que já tem cadastro, pelo telefone.
 *
 * Serve só para a saudação: o endpoint devolve apenas o primeiro nome, nunca
 * dados completos, porque é público e sem autenticação (ver
 * src/app/api/booking/lookup/route.ts).
 */
function useReturningClient(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const key = digits.length === 10 || digits.length === 11 ? digits : "";

  const [state, setState] = React.useState<{
    key: string;
    firstName: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (!key) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/booking/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: key }),
        signal: controller.signal,
      })
        .then((response) => response.json() as Promise<{ found: boolean; firstName?: string }>)
        .then((data) =>
          setState({ key, firstName: data.found ? (data.firstName ?? null) : null }),
        )
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setState({ key, firstName: null });
        });
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key]);

  if (state?.key !== key || !state.firstName) return null;
  return { firstName: state.firstName };
}
