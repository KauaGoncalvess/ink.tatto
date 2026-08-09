import { z } from "zod";

import { isValidDateISO, isValidTime } from "@/lib/datetime";
import { normalizePhone } from "@/lib/utils";

/**
 * Schemas do agendamento, compartilhados entre cliente e servidor.
 *
 * O mesmo objeto valida o formulário no navegador (React Hook Form) e a
 * entrada da Server Action. Validar no cliente é UX; validar no servidor é
 * segurança — e o servidor nunca confia no que chegou.
 */

const cuid = z.string().min(1, "Seleção inválida.").max(64);

export const dateISOSchema = z
  .string()
  .refine(isValidDateISO, "Data inválida.");

export const timeSchema = z.string().refine(isValidTime, "Horário inválido.");

/** Telefone brasileiro com DDD, fixo ou celular. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Informe seu telefone.")
  .transform(normalizePhone)
  .refine(
    (value) => value.length === 10 || value.length === 11,
    "Telefone inválido. Use DDD + número, como (11) 98765-4321.",
  );

export const clientDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(120, "Nome muito longo.")
    // Evita que o campo seja usado para injetar links no painel do estúdio.
    .refine((v) => !/https?:\/\//i.test(v), "O nome não pode conter links."),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .max(180, "E-mail muito longo.")
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  referenceNotes: z
    .string()
    .trim()
    .max(1000, "Máximo de 1000 caracteres.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  referenceImage: z
    .string()
    .trim()
    .max(300)
    // Só aceita caminho relativo gerado pelo próprio upload — impede que a
    // action seja usada para gravar uma URL externa arbitrária no banco.
    .regex(/^\/uploads\/[a-z0-9._-]+$/i, "Referência inválida.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const createAppointmentSchema = z.object({
  serviceId: cuid,
  artistId: cuid,
  dateISO: dateISOSchema,
  time: timeSchema,
  ...clientDetailsSchema.shape,
});

export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;
export type CreateAppointmentData = z.output<typeof createAppointmentSchema>;

/** Consulta de disponibilidade (rota GET pública). */
export const availabilityQuerySchema = z.object({
  artistId: cuid,
  serviceId: cuid,
  dateISO: dateISOSchema,
});

export const availableDaysQuerySchema = z.object({
  artistId: cuid,
  serviceId: cuid,
  fromISO: dateISOSchema,
  toISO: dateISOSchema,
});
