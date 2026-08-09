import { z } from "zod";

import { isValidTime } from "@/lib/datetime";
import { normalizePhone } from "@/lib/utils";

/**
 * Schemas dos CRUDs administrativos.
 *
 * Os mesmos objetos validam o formulário no navegador e a Server Action —
 * uma regra só, num lugar só.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url("Informe uma URL válida (com https://).")
  .optional()
  .or(z.literal("").transform(() => undefined));

/**
 * Caminho de imagem aceito nos formulários do painel.
 *
 * Aceita um arquivo gerenciado pelo próprio sistema (`/uploads/...` ou
 * `/images/...`) ou uma URL absoluta, que é o formato devolvido pelo driver de
 * storage em bucket. Recusa qualquer outra coisa para o campo não virar um
 * vetor de injeção de conteúdo externo no site.
 */
const imagePathSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^\/(uploads|images)\//.test(value) || /^https:\/\/\S+$/.test(value),
    "Envie uma imagem ou informe um caminho começando com /images/.",
  );

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone.")
    .transform(normalizePhone)
    .refine(
      (value) => value.length === 10 || value.length === 11,
      "Telefone inválido. Use DDD + número.",
    ),
  email: z
    .string()
    .trim()
    .max(180)
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalText(1000),
  isBlocked: z.boolean().default(false),
});

export type ClientInput = z.input<typeof clientSchema>;

// ---------------------------------------------------------------------------
// Artistas
// ---------------------------------------------------------------------------

const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isActive: z.boolean(),
    startTime: z.string().refine(isValidTime, "Horário inválido."),
    endTime: z.string().refine(isValidTime, "Horário inválido."),
    breakStart: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    breakEnd: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((day) => !day.isActive || day.startTime < day.endTime, {
    message: "O fim do expediente precisa ser depois do início.",
    path: ["endTime"],
  })
  .refine(
    (day) =>
      // Ou nenhum dos dois, ou os dois com início antes do fim.
      (!day.breakStart && !day.breakEnd) ||
      Boolean(day.breakStart && day.breakEnd && day.breakStart < day.breakEnd),
    { message: "Preencha início e fim do intervalo, nessa ordem.", path: ["breakEnd"] },
  )
  .refine(
    (day) =>
      !day.breakStart ||
      !day.breakEnd ||
      (day.breakStart >= day.startTime && day.breakEnd <= day.endTime),
    { message: "O intervalo precisa estar dentro do expediente.", path: ["breakStart"] },
  );

export const artistSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  handle: optionalText(40),
  shortBio: z
    .string()
    .trim()
    .min(10, "Escreva ao menos uma frase.")
    .max(200, "Máximo de 200 caracteres."),
  bio: z.string().trim().min(20, "A bio precisa de ao menos 20 caracteres.").max(3000),
  specialties: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Informe ao menos uma especialidade.")
    .max(8, "No máximo 8 especialidades."),
  yearsOfExp: z.coerce.number().int().min(0).max(70),
  instagram: optionalUrl,
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .max(180)
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  avatarUrl: imagePathSchema
    .optional()
    .or(z.literal("").transform(() => undefined)),
  isActive: z.boolean().default(true),
  acceptsBooking: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  serviceIds: z.array(z.string()).default([]),
  schedule: z.array(scheduleDaySchema).length(7, "Informe os sete dias da semana."),
});

export type ArtistInput = z.input<typeof artistSchema>;

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome do serviço.").max(120),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Escreva uma frase curta de apresentação.")
    .max(200),
  description: z.string().trim().min(20, "Descreva o serviço.").max(3000),
  icon: z.string().trim().min(1).max(40).default("Sparkles"),
  imageUrl: imagePathSchema
    .optional()
    .or(z.literal("").transform(() => undefined)),
  durationMin: z.coerce
    .number()
    .int()
    .min(15, "A duração mínima é de 15 minutos.")
    .max(600, "A duração máxima é de 10 horas."),
  bufferMin: z.coerce.number().int().min(0).max(120).default(15),
  // O formulário recebe reais; o banco guarda centavos.
  priceFrom: z.coerce
    .number()
    .min(0, "O valor não pode ser negativo.")
    .max(1_000_000)
    .transform((value) => Math.round(value * 100)),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type ServiceInput = z.input<typeof serviceSchema>;

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export const galleryItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Informe um título.").max(120),
  style: z.string().trim().min(2, "Informe o estilo.").max(40),
  imageUrl: imagePathSchema.min(1, "Envie a foto do trabalho."),
  alt: z
    .string()
    .trim()
    .min(10, "Descreva a imagem — é o que o leitor de tela anuncia.")
    .max(200),
  description: optionalText(500),
  bodyPart: optionalText(60),
  artistId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type GalleryItemInput = z.input<typeof galleryItemSchema>;

// ---------------------------------------------------------------------------
// Depoimentos
// ---------------------------------------------------------------------------

export const testimonialSchema = z.object({
  id: z.string().optional(),
  clientName: z.string().trim().min(2, "Informe o nome do cliente.").max(80),
  avatarUrl: imagePathSchema
    .optional()
    .or(z.literal("").transform(() => undefined)),
  rating: z.coerce.number().int().min(1, "A nota vai de 1 a 5.").max(5),
  content: z.string().trim().min(20, "O depoimento está muito curto.").max(1000),
  serviceName: optionalText(120),
  artistId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  isPublished: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type TestimonialInput = z.input<typeof testimonialSchema>;

// ---------------------------------------------------------------------------
// Configurações do estúdio
// ---------------------------------------------------------------------------

export const openingHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    opensAt: z.string().refine(isValidTime, "Horário inválido."),
    closesAt: z.string().refine(isValidTime, "Horário inválido."),
  })
  .refine((day) => !day.isOpen || day.opensAt < day.closesAt, {
    message: "O fechamento precisa ser depois da abertura.",
    path: ["closesAt"],
  });

export const studioSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(1000),
  phone: z.string().trim().min(8).max(30),
  whatsapp: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^\d+$/, "Use somente dígitos, com DDI. Ex.: 5511987654321."),
  email: z.string().trim().email("E-mail inválido.").max(180),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2, "Use a sigla do estado, com 2 letras."),
  zip: z.string().trim().min(8).max(10),
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  timezone: z.string().trim().min(3).max(60),
  slotStepMin: z.coerce
    .number()
    .int()
    .min(5, "O passo mínimo é de 5 minutos.")
    .max(120, "O passo máximo é de 2 horas."),
  minLeadTimeHours: z.coerce.number().int().min(0).max(720),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  openingHours: z.array(openingHourSchema).length(7),
});

export type StudioSettingsInput = z.input<typeof studioSettingsSchema>;
