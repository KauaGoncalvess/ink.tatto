import { z } from "zod";

import { dateISOSchema, timeSchema } from "@/schemas/booking";
import { normalizePhone } from "@/lib/utils";

/**
 * Schemas das operações de agenda feitas pelo próprio estúdio.
 *
 * Diferem do agendamento público em dois pontos deliberados:
 *  - o cliente pode ser um cadastro existente (o estúdio atende quem já
 *    conhece), então o telefone não é sempre obrigatório;
 *  - é possível forçar um encaixe fora da grade padrão do artista, porque
 *    marcar por telefone às vezes significa abrir uma exceção. O que continua
 *    proibido, sempre, é sobrepor outro agendamento.
 */

const cuid = z.string().min(1, "Seleção inválida.").max(64);

/** Cliente: ou um já cadastrado, ou os dados de um novo. */
const clientRefSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    clientId: cuid,
  }),
  z.object({
    mode: z.literal("new"),
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
  }),
]);

export const adminCreateAppointmentSchema = z.object({
  client: clientRefSchema,
  serviceId: cuid,
  artistId: cuid,
  dateISO: dateISOSchema,
  time: timeSchema,
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
  /** Sobrescreve o preço do serviço, em reais. */
  priceOverride: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  internalNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  referenceNotes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Permite marcar fora da grade padrão do artista (encaixe). */
  allowOutsideSchedule: z.boolean().default(false),
});

export type AdminCreateAppointmentInput = z.input<
  typeof adminCreateAppointmentSchema
>;

/** Edição completa: pode trocar serviço, cliente, preço e status. */
export const adminEditAppointmentSchema = z.object({
  id: cuid,
  clientId: cuid,
  serviceId: cuid,
  artistId: cuid,
  dateISO: dateISOSchema,
  time: timeSchema,
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  priceEstimate: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  internalNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  cancelledReason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  allowOutsideSchedule: z.boolean().default(true),
});

export type AdminEditAppointmentInput = z.input<typeof adminEditAppointmentSchema>;

/** Converte "350" ou "350,00" em centavos. */
export function parsePriceToCents(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}
