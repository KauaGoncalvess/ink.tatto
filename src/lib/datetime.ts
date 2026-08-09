import { addMinutes, format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";

/**
 * Camada única de fuso horário.
 *
 * Regra do projeto: no banco tudo é UTC (`DateTime`). Qualquer conversão para
 * o horário do estúdio acontece aqui, na borda. Nenhum outro módulo deve usar
 * `new Date(y, m, d)` para lógica de agenda — isso usaria o fuso do servidor,
 * que em produção é UTC e produziria horários errados.
 */

// Anotado como `string` de propósito: siteConfig é `as const`, e sem isto o
// tipo literal se propagaria para todos os parâmetros `timeZone` do módulo.
export const DEFAULT_TIMEZONE: string = siteConfig.timezone;

/** "HH:mm" -> minutos desde a meia-noite. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  const hours = Number(h);
  const minutes = Number(m ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Horário inválido: "${time}"`);
  }
  return hours * 60 + minutes;
}

/** Minutos desde a meia-noite -> "HH:mm". */
export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "2026-08-15" -> Date UTC que representa 00:00 daquele dia no fuso do estúdio. */
export function startOfDayInZone(dateISO: string, timeZone = DEFAULT_TIMEZONE): Date {
  return fromZonedTime(`${dateISO} 00:00:00`, timeZone);
}

/**
 * Combina uma data local ("2026-08-15") e um horário local ("14:30") no
 * instante UTC correspondente. É a função usada para gravar `startsAt`.
 */
export function zonedDateTimeToUtc(
  dateISO: string,
  time: string,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const [h, m] = time.split(":");
  const hh = String(Number(h)).padStart(2, "0");
  const mm = String(Number(m ?? 0)).padStart(2, "0");
  return fromZonedTime(`${dateISO} ${hh}:${mm}:00`, timeZone);
}

/** Instante UTC -> "2026-08-15" no fuso do estúdio. */
export function toDateISO(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

/** Instante UTC -> "14:30" no fuso do estúdio. */
export function toTimeString(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

/** Dia da semana (0=domingo ... 6=sábado) no fuso do estúdio. */
export function dayOfWeekInZone(date: Date, timeZone = DEFAULT_TIMEZONE): number {
  return Number(formatInTimeZone(date, timeZone, "i")) % 7;
}

/** Dia da semana de uma data ISO, sem passar pelo fuso do servidor. */
export function dayOfWeekFromISO(dateISO: string, timeZone = DEFAULT_TIMEZONE): number {
  return dayOfWeekInZone(startOfDayInZone(dateISO, timeZone), timeZone);
}

/** Formatação livre no fuso do estúdio, sempre em pt-BR. */
export function formatInStudio(
  date: Date,
  pattern: string,
  timeZone = DEFAULT_TIMEZONE,
): string {
  return formatInTimeZone(date, timeZone, pattern, { locale: ptBR });
}

/** "sexta-feira, 15 de agosto" — usado em resumos e confirmações. */
export function formatLongDate(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return formatInStudio(date, "EEEE, d 'de' MMMM", timeZone);
}

/** "15/08/2026" */
export function formatShortDate(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return formatInStudio(date, "dd/MM/yyyy", timeZone);
}

/** "15/08/2026 às 14:30" */
export function formatDateTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return formatInStudio(date, "dd/MM/yyyy 'às' HH:mm", timeZone);
}

/** Data ISO de hoje no fuso do estúdio. */
export function todayISO(timeZone = DEFAULT_TIMEZONE): string {
  return toDateISO(new Date(), timeZone);
}

/** Soma dias a uma data ISO mantendo a semântica de calendário local. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  // Date.UTC evita qualquer interferência do fuso do servidor: aqui estamos
  // fazendo aritmética de calendário, não de instante.
  const base = new Date(Date.UTC(y!, m! - 1, d!));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas ISO. */
export function diffDaysISO(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Valida "YYYY-MM-DD" e checa que a data existe de verdade (rejeita 2026-02-30). */
export function isValidDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
  );
}

/** Valida "HH:mm" no intervalo 00:00–23:59. */
export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h! >= 0 && h! <= 23 && m! >= 0 && m! <= 59;
}

/** Dois intervalos [aStart, aEnd) e [bStart, bEnd) se sobrepõem? */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Lista de datas ISO entre duas datas, inclusivo. */
export function eachDayISO(fromISO: string, toISO: string): string[] {
  const days: string[] = [];
  const total = diffDaysISO(fromISO, toISO);
  for (let i = 0; i <= total; i += 1) days.push(addDaysISO(fromISO, i));
  return days;
}

/** Converte um instante UTC para um `Date` "achatado" no fuso do estúdio.
 *  Útil só para componentes de calendário que trabalham com horário local. */
export function toStudioLocal(date: Date, timeZone = DEFAULT_TIMEZONE): Date {
  return toZonedTime(date, timeZone);
}

/** Nomes curtos dos dias da semana, índice 0=domingo. */
export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Reexports usados pelos módulos de agenda, para manter um só ponto de import. */
export { addMinutes, format, parse };
