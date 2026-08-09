import "server-only";

/**
 * Rate limiting simples em memória (token bucket com janela deslizante).
 *
 * Escopo consciente: protege contra força bruta no login e contra flood no
 * formulário público de agendamento em uma única instância. Em deploy
 * multi-instância ou serverless, cada instância tem o próprio contador — para
 * produção com escala, troque a implementação de `hit()` por Redis
 * (Upstash `@upstash/ratelimit` encaixa sem mudar as chamadas).
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Remove buckets expirados para o Map não crescer indefinidamente. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Segundos até a janela reabrir. */
  retryAfter: number;
};

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Zera o contador — chamado após um login bem-sucedido. */
export function reset(key: string): void {
  buckets.delete(key);
}

/** Políticas nomeadas, para os limites ficarem num lugar só. */
export const RATE_LIMITS = {
  /** 5 tentativas de login por IP a cada 10 minutos. */
  login: { limit: 5, windowMs: 10 * 60_000 },
  /** 5 agendamentos por IP por hora. */
  booking: { limit: 5, windowMs: 60 * 60_000 },
  /** 10 uploads de referência por IP por hora. */
  upload: { limit: 10, windowMs: 60 * 60_000 },
} as const;

/**
 * IP do cliente a partir dos headers da requisição.
 *
 * Confia em x-forwarded-for porque a aplicação é desenhada para rodar atrás de
 * um proxy (Vercel, nginx). Sem proxy, o valor cai para "unknown" e o limite
 * passa a ser global — conservador, e é o comportamento desejado.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
