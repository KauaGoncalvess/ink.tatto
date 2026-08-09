import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge de classes Tailwind com precedência correta. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata centavos inteiros como moeda brasileira. Preços são guardados em
 *  centavos no banco para evitar erro de ponto flutuante. */
export function formatCurrency(cents: number, currency = "BRL", locale = "pt-BR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "2h30" / "45min" — leitura curta para cards e tabelas. */
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

/** (11) 98765-4321 a partir de qualquer entrada com dígitos. */
export function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/** Normaliza telefone para armazenamento/deduplicação: só dígitos, sem DDI. */
export function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
}

/** Slug ASCII a partir de texto com acentos. */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Iniciais para avatares sem foto. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Corta texto preservando palavras. */
export function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Ordena estável por chave numérica. */
export function sortBy<T>(items: readonly T[], key: (item: T) => number): T[] {
  return [...items].sort((a, b) => key(a) - key(b));
}

/** Agrupa por chave — usado em dashboards e no calendário. */
export function groupBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
