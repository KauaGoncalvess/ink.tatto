import "server-only";

/**
 * Rate limiting.
 *
 * Dois drivers, escolhidos por variável de ambiente:
 *
 *   memory (padrão)  janela deslizante em memória. Correto e suficiente numa
 *                    única instância (VPS, container). Em deploy com várias
 *                    réplicas cada uma tem o próprio contador, o que na
 *                    prática multiplica o limite pelo número de instâncias.
 *   upstash          Redis via API HTTP do Upstash. Contador único e
 *                    compartilhado, necessário em serverless e multi-réplica.
 *                    Ative com UPSTASH_REDIS_REST_URL e ..._TOKEN.
 *
 * A API é síncrona no driver de memória e assíncrona no Redis, então tudo é
 * exposto como Promise — quem chama não precisa saber qual está ativo.
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Segundos até a janela reabrir. */
  retryAfter: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Remove buckets expirados para o Map não crescer indefinidamente. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function hitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
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

// ---------------------------------------------------------------------------
// Upstash Redis
// ---------------------------------------------------------------------------

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const rateLimitDriver =
  upstashUrl && upstashToken ? "upstash" : "memory";

/**
 * INCR + EXPIRE numa única chamada em pipeline.
 *
 * O EXPIRE só é aplicado quando o contador acabou de nascer (valor 1), o que
 * torna a janela fixa a partir da primeira requisição — comportamento igual ao
 * do driver de memória.
 */
async function hitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const seconds = Math.ceil(windowMs / 1000);

  try {
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["TTL", key],
      ]),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const [incr, ttl] = (await response.json()) as { result: number }[];
    const count = incr?.result ?? 1;
    let remainingTtl = ttl?.result ?? -1;

    // Chave recém-criada (ou sem TTL): define a janela.
    if (remainingTtl < 0) {
      await fetch(`${upstashUrl}/expire/${encodeURIComponent(key)}/${seconds}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      });
      remainingTtl = seconds;
    }

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfter: remainingTtl };
    }
    return { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch (error) {
    // Redis fora do ar não pode derrubar o login do estúdio inteiro. Cai para
    // o contador local, que ao menos limita por instância.
    console.error("[rate-limit] Upstash indisponível, usando memória", error);
    return hitMemory(key, limit, windowMs);
  }
}

// ---------------------------------------------------------------------------

export async function hit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (rateLimitDriver === "upstash") return hitUpstash(key, limit, windowMs);
  return hitMemory(key, limit, windowMs);
}

/** Zera o contador — chamado após um login bem-sucedido. */
export async function reset(key: string): Promise<void> {
  buckets.delete(key);

  if (rateLimitDriver === "upstash") {
    try {
      await fetch(`${upstashUrl}/del/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      });
    } catch (error) {
      console.error("[rate-limit] falha ao limpar contador", error);
    }
  }
}

/** Políticas nomeadas, para os limites ficarem num lugar só. */
export const RATE_LIMITS = {
  /** 5 tentativas de login por IP a cada 10 minutos. */
  login: { limit: 5, windowMs: 10 * 60_000 },
  /** 5 agendamentos por IP por hora. */
  booking: { limit: 5, windowMs: 60 * 60_000 },
  /** 10 uploads de referência por IP por hora (visitante). */
  upload: { limit: 10, windowMs: 60 * 60_000 },
  /**
   * 5 trocas de senha por usuário a cada 15 minutos.
   *
   * A troca exige a senha atual, o que transforma o formulário num oráculo
   * para quem tomou uma sessão emprestada — sem limite, dá para varrer senhas
   * a partir de um navegador já aberto.
   */
  passwordChange: { limit: 5, windowMs: 15 * 60_000 },
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
