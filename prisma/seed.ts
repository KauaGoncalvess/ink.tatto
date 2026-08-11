/**
 * Seed de demonstração.
 *
 * Popula o estúdio inteiro com dados fictícios porém verossímeis, incluindo
 * uma agenda coerente: os 30 agendamentos são gerados a partir da grade real
 * de cada artista e passam pelo mesmo motor de disponibilidade usado em
 * produção, então nenhum deles conflita ou cai fora do expediente.
 *
 * ATENÇÃO: este script APAGA TODAS AS TABELAS antes de popular. É ferramenta
 * de desenvolvimento e demonstração — nunca de produção. Para colocar um
 * administrador num banco de produção sem tocar em mais nada, use
 * `npm run admin:create`.
 *
 * Uso:  npm run db:seed
 *       npm run db:reset   (recria o banco e roda o seed)
 */

import { randomBytes } from "node:crypto";

import { PrismaClient, type AppointmentStatus, type Prisma } from "@prisma/client";

import { ARTIST_SEED } from "./seed-data/artists";
import { SERVICE_SEED } from "./seed-data/services";
import { CLIENT_SEED, GALLERY_SEED, TESTIMONIAL_SEED } from "./seed-data/content";
import { computeSlots, type BusyInterval } from "../src/lib/availability";
import { addDaysISO, toDateISO } from "../src/lib/datetime";
import {
  artistImagePath,
  galleryImagePath,
  serviceImagePath,
  testimonialAvatarPath,
} from "../src/config/images";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const TIMEZONE = "America/Sao_Paulo";

/**
 * Senha dos logins de artista.
 *
 * Era a string literal "InkHouse@2026", a mesma publicada no README — cinco
 * contas com acesso ao painel e senha conhecida por qualquer um que lesse o
 * repositório. Sem `SEED_ARTIST_PASSWORD` agora sai uma senha aleatória por
 * execução, impressa no fim: quem precisa dela tem, e quem lê o código não.
 */
const ARTIST_PASSWORD =
  process.env.SEED_ARTIST_PASSWORD ?? randomBytes(9).toString("base64url");

/** PRNG com semente fixa: o seed é reproduzível entre execuções. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const random = makeRandom(20260808);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

/** Código de reserva legível, no mesmo formato usado em produção. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `IH-${out}`;
}

async function clearDatabase() {
  // Ordem importa por causa das FKs; deleteMany respeita o onDelete mas é mais
  // previsível apagar explicitamente das folhas para a raiz.
  await prisma.notification.deleteMany();
  // A auditoria não cai junto com o usuário (`onDelete: SetNull`, para o
  // histórico sobreviver a uma exclusão real). Num seed isso deixaria trilha
  // órfã de uma base que não existe mais, então some explicitamente.
  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.artistService.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.galleryItem.deleteMany();
  await prisma.client.deleteMany();
  await prisma.service.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();
  await prisma.openingHour.deleteMany();
  await prisma.studioSettings.deleteMany();
}

async function seedSettings() {
  await prisma.studioSettings.create({
    data: {
      id: "studio",
      name: "Ink House",
      tagline: "Tattoo Studio",
      description:
        "Estúdio de tatuagem autoral em São Paulo. Artistas especializados em realismo, blackwork, fine line e oriental, com ambiente seguro, esterilizado e atendimento personalizado.",
      phone: "(11) 98765-4321",
      whatsapp: "5511987654321",
      email: "contato@inkhouse.studio",
      address: "Rua das Tatuagens, 123 — Vila Madalena",
      city: "São Paulo",
      state: "SP",
      zip: "05435-000",
      instagram: "https://instagram.com/inkhouse.studio",
      facebook: "https://facebook.com/inkhouse.studio",
      tiktok: "https://tiktok.com/@inkhouse.studio",
      timezone: TIMEZONE,
      slotStepMin: 30,
      minLeadTimeHours: 12,
      maxAdvanceDays: 90,
      openingHours: {
        create: [
          { dayOfWeek: 0, isOpen: false, opensAt: "09:00", closesAt: "18:00" },
          { dayOfWeek: 1, isOpen: true, opensAt: "08:00", closesAt: "20:00" },
          { dayOfWeek: 2, isOpen: true, opensAt: "08:00", closesAt: "20:00" },
          { dayOfWeek: 3, isOpen: true, opensAt: "08:00", closesAt: "20:00" },
          { dayOfWeek: 4, isOpen: true, opensAt: "08:00", closesAt: "20:00" },
          { dayOfWeek: 5, isOpen: true, opensAt: "08:00", closesAt: "20:00" },
          { dayOfWeek: 6, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
        ],
      },
    },
  });
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@inkhouse.studio";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "InkHouse@2026";
  const name = process.env.SEED_ADMIN_NAME ?? "Administração Ink House";

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });

  return { email, password };
}

async function seedServices() {
  const services = new Map<string, string>();

  for (const service of SERVICE_SEED) {
    const created = await prisma.service.create({
      data: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        shortDescription: service.shortDescription,
        icon: service.icon,
        imageUrl: serviceImagePath(service.slug),
        durationMin: service.durationMin,
        bufferMin: service.bufferMin,
        priceFrom: service.priceFrom,
        isFeatured: service.isFeatured,
        displayOrder: service.displayOrder,
      },
    });
    services.set(service.slug, created.id);
  }

  return services;
}

async function seedArtists(services: Map<string, string>) {
  const artists = new Map<string, string>();

  for (const artist of ARTIST_SEED) {
    // Cada artista também recebe um login (papel ARTIST) para poder acessar o
    // painel e ver a própria agenda.
    const user = await prisma.user.create({
      data: {
        email: `${artist.slug}@inkhouse.studio`,
        name: artist.name,
        passwordHash: await hashPassword(ARTIST_PASSWORD),
        role: "ARTIST",
      },
    });

    const created = await prisma.artist.create({
      data: {
        slug: artist.slug,
        name: artist.name,
        handle: artist.handle,
        bio: artist.bio,
        shortBio: artist.shortBio,
        avatarUrl: artistImagePath(artist.slug),
        coverUrl: artistImagePath(artist.slug),
        instagram: artist.instagram,
        email: `${artist.slug}@inkhouse.studio`,
        specialties: artist.specialties,
        yearsOfExp: artist.yearsOfExp,
        displayOrder: artist.displayOrder,
        userId: user.id,
        availability: {
          create: artist.schedule.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
          })),
        },
        services: {
          create: artist.services
            .filter((slug) => services.has(slug))
            .map((slug) => ({ serviceId: services.get(slug)! })),
        },
      },
    });

    artists.set(artist.slug, created.id);
  }

  return artists;
}

async function seedClients() {
  const ids: string[] = [];
  const today = new Date();

  for (let i = 0; i < CLIENT_SEED.length; i += 1) {
    const client = CLIENT_SEED[i]!;
    // Distribui as datas de cadastro nos últimos 14 meses.
    const daysAgo = Math.floor(random() * 420) + 5;
    const created = await prisma.client.create({
      data: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes ?? null,
        createdAt: new Date(today.getTime() - daysAgo * 86_400_000),
      },
    });
    ids.push(created.id);
  }

  return ids;
}

async function seedBlockedTimes(artists: Map<string, string>) {
  const todayISO = toDateISO(new Date(), TIMEZONE);

  const blocks: Prisma.BlockedTimeCreateManyInput[] = [
    // Férias da Marina daqui a três semanas.
    {
      artistId: artists.get("marina-vasquez")!,
      startsAt: new Date(`${addDaysISO(todayISO, 21)}T03:00:00.000Z`),
      endsAt: new Date(`${addDaysISO(todayISO, 32)}T03:00:00.000Z`),
      reason: "VACATION",
      note: "Férias programadas",
    },
    // Folga pontual do Caio.
    {
      artistId: artists.get("caio-ferrante")!,
      startsAt: new Date(`${addDaysISO(todayISO, 9)}T03:00:00.000Z`),
      endsAt: new Date(`${addDaysISO(todayISO, 10)}T03:00:00.000Z`),
      reason: "DAY_OFF",
      note: "Compromisso pessoal",
    },
    // Convenção — estúdio inteiro fechado (artistId nulo).
    {
      artistId: null,
      startsAt: new Date(`${addDaysISO(todayISO, 45)}T03:00:00.000Z`),
      endsAt: new Date(`${addDaysISO(todayISO, 47)}T03:00:00.000Z`),
      reason: "OTHER",
      note: "Convenção de tatuagem — estúdio fechado",
    },
  ];

  await prisma.blockedTime.createMany({ data: blocks });
}

/**
 * Gera 30 agendamentos coerentes.
 *
 * Em vez de sortear horários aleatórios (que produziriam conflitos e sessões
 * fora do expediente), pede horários livres ao próprio motor de
 * disponibilidade e vai acumulando os já ocupados — exatamente como o site faz.
 */
async function seedAppointments(clientIds: string[]) {
  const artists = await prisma.artist.findMany({
    include: { availability: true, services: { include: { service: true } } },
  });
  const openingHours = await prisma.openingHour.findMany();
  const studioHours = openingHours.map((entry) => ({
    dayOfWeek: entry.dayOfWeek,
    isOpen: entry.isOpen,
    opensAt: entry.opensAt,
    closesAt: entry.closesAt,
  }));

  const blocked = await prisma.blockedTime.findMany();

  // Ocupação acumulada por artista, alimentada a cada agendamento criado.
  const busyByArtist = new Map<string, BusyInterval[]>();
  for (const artist of artists) {
    busyByArtist.set(
      artist.id,
      blocked
        .filter((b) => b.artistId === artist.id || b.artistId === null)
        .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    );
  }

  const todayISO = toDateISO(new Date(), TIMEZONE);
  const usedCodes = new Set<string>();

  /** Distribuição de status por posição no tempo. */
  const pastStatuses: AppointmentStatus[] = [
    "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED",
    "COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW",
  ];
  const futureStatuses: AppointmentStatus[] = [
    "CONFIRMED", "CONFIRMED", "CONFIRMED", "PENDING", "PENDING", "CANCELLED",
  ];

  const referenceNotes = [
    "Quero algo no antebraço, tema natureza, tamanho médio. Levo referências no dia.",
    "Cobertura de uma tatuagem antiga no ombro. Mando foto pelo WhatsApp.",
    "Primeira tatuagem, algo pequeno e discreto no pulso.",
    "Continuação do projeto de fechamento do braço direito.",
    "Retoque da tatuagem feita em janeiro, o preto abriu um pouco.",
    "Lettering com frase curta, quero discutir a tipografia antes.",
    null,
  ];

  let created = 0;
  let attempt = 0;
  const TARGET = 30;

  // Varre um intervalo de -60 a +45 dias, alternando passado e futuro.
  const dayOffsets: number[] = [];
  for (let i = 1; i <= 60; i += 1) {
    if (i <= 45) dayOffsets.push(i);
    dayOffsets.push(-i);
  }

  while (created < TARGET && attempt < dayOffsets.length * artists.length) {
    const offset = dayOffsets[attempt % dayOffsets.length]!;
    const artist = artists[Math.floor(attempt / dayOffsets.length) % artists.length]!;
    attempt += 1;

    if (artist.services.length === 0) continue;

    const dateISO = addDaysISO(todayISO, offset);
    const link = pick(artist.services);
    const service = link.service;

    const busy = busyByArtist.get(artist.id) ?? [];

    const slots = computeSlots({
      dateISO,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      schedule: artist.availability.map((entry) => ({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakStart: entry.breakStart,
        breakEnd: entry.breakEnd,
        isActive: entry.isActive,
      })),
      studioHours,
      busy,
      rules: { slotStepMin: 30, minLeadTimeHours: 0, timezone: TIMEZONE },
      // Data de referência no passado remoto: aqui queremos preencher também
      // dias anteriores a hoje, o que o lead time normalmente impediria.
      now: new Date("2000-01-01T00:00:00Z"),
    });

    if (slots.length === 0) continue;

    const slot = pick(slots);

    let code = makeCode();
    while (usedCodes.has(code)) code = makeCode();
    usedCodes.add(code);

    const isPast = offset < 0;
    const status = isPast ? pick(pastStatuses) : pick(futureStatuses);

    await prisma.appointment.create({
      data: {
        code,
        clientId: pick(clientIds),
        artistId: artist.id,
        serviceId: service.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status,
        source: random() > 0.25 ? "WEBSITE" : "ADMIN",
        priceEstimate: link.priceFrom ?? service.priceFrom,
        referenceNotes: pick(referenceNotes),
        cancelledAt: status === "CANCELLED" ? new Date(slot.startsAt.getTime() - 86_400_000) : null,
        cancelledReason:
          status === "CANCELLED" ? pick(["Cliente remarcou", "Imprevisto do cliente", null]) : null,
        createdAt: new Date(slot.startsAt.getTime() - (2 + random() * 20) * 86_400_000),
      },
    });

    // Cancelado e não comparecido não bloqueiam a agenda — mesma regra do motor.
    if (status !== "CANCELLED") {
      busy.push({ startsAt: slot.startsAt, endsAt: slot.endsAt });
      busyByArtist.set(artist.id, busy);
    }

    created += 1;
  }

  return created;
}

async function seedGallery(artists: Map<string, string>) {
  for (let i = 0; i < GALLERY_SEED.length; i += 1) {
    const item = GALLERY_SEED[i]!;
    await prisma.galleryItem.create({
      data: {
        title: item.title,
        style: item.style,
        imageUrl: galleryImagePath(i + 1),
        alt: item.alt,
        description: item.description,
        bodyPart: item.bodyPart,
        artistId: artists.get(item.artistSlug) ?? null,
        isFeatured: item.isFeatured,
        displayOrder: i + 1,
      },
    });
  }
}

async function seedTestimonials(artists: Map<string, string>) {
  for (let i = 0; i < TESTIMONIAL_SEED.length; i += 1) {
    const item = TESTIMONIAL_SEED[i]!;
    await prisma.testimonial.create({
      data: {
        clientName: item.clientName,
        avatarUrl: testimonialAvatarPath(i + 1),
        rating: item.rating,
        content: item.content,
        serviceName: item.serviceName,
        artistId: artists.get(item.artistSlug) ?? null,
        displayOrder: i + 1,
      },
    });
  }
}

/** Notificações in-app dos agendamentos pendentes, para o badge do admin. */
async function seedNotifications() {
  const pending = await prisma.appointment.findMany({
    where: { status: "PENDING" },
    include: { client: true, service: true },
    take: 10,
  });

  for (const appointment of pending) {
    await prisma.notification.create({
      data: {
        type: "APPOINTMENT_CREATED",
        channel: "IN_APP",
        title: "Novo agendamento solicitado",
        message: `${appointment.client.name} solicitou ${appointment.service.name}.`,
        appointmentId: appointment.id,
      },
    });
  }
}

/**
 * Recusa rodar em produção.
 *
 * `clearDatabase()` apaga todas as tabelas, e um `npm run db:seed` digitado
 * com o `DATABASE_URL` de produção carregado no ambiente é irreversível. A
 * checagem é por `NODE_ENV`, então `prisma migrate reset` local segue
 * funcionando normalmente.
 */
function assertNotProduction() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SEED_ALLOW_PRODUCTION === "1") {
    console.warn(
      "⚠ SEED_ALLOW_PRODUCTION=1 — apagando todas as tabelas em NODE_ENV=production.",
    );
    return;
  }

  console.error(`
✗ Seed bloqueado: NODE_ENV=production.

  Este script apaga TODAS as tabelas antes de popular com dados fictícios.
  Para criar um administrador em produção sem destruir nada:

    ADMIN_EMAIL=voce@estudio.com.br ADMIN_PASSWORD='...' npm run admin:create

  Se você realmente quer apagar este banco, repita com SEED_ALLOW_PRODUCTION=1.
`);
  process.exit(1);
}

async function main() {
  assertNotProduction();

  console.log("→ limpando dados existentes…");
  await clearDatabase();

  console.log("→ configurações do estúdio…");
  await seedSettings();

  console.log("→ administrador…");
  const admin = await seedAdmin();

  console.log("→ serviços…");
  const services = await seedServices();

  console.log("→ artistas, grades e vínculos de serviço…");
  const artists = await seedArtists(services);

  console.log("→ clientes…");
  const clientIds = await seedClients();

  console.log("→ bloqueios e férias…");
  await seedBlockedTimes(artists);

  console.log("→ agendamentos…");
  const appointments = await seedAppointments(clientIds);

  console.log("→ galeria…");
  await seedGallery(artists);

  console.log("→ depoimentos…");
  await seedTestimonials(artists);

  console.log("→ notificações…");
  await seedNotifications();

  console.log(`
✔ Seed concluído
  ${ARTIST_SEED.length} artistas · ${SERVICE_SEED.length} serviços · ${clientIds.length} clientes
  ${appointments} agendamentos · ${GALLERY_SEED.length} trabalhos · ${TESTIMONIAL_SEED.length} depoimentos

  Painel administrativo: /admin/login
    email: ${admin.email}
    senha: ${admin.password}

  Artistas (papel ARTIST) entram com o próprio e-mail e a senha:
    ${ARTIST_PASSWORD}

  Estas credenciais são de demonstração. Em produção, use
  \`npm run admin:create\` e troque a senha em /admin/conta.
`);
}

main()
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
