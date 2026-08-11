import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança.
 *
 * A CSP não está aqui porque precisa de um nonce novo a cada requisição —
 * ela é montada em `src/proxy.ts`, o único ponto que roda antes do render.
 * Abaixo ficam os cabeçalhos que são estáticos por natureza.
 */
const securityHeaders = [
  // Impede o navegador de "adivinhar" o tipo de um arquivo enviado por cliente.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // O site não deve ser embutido em iframe de terceiros (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nenhuma dessas APIs é usada pela aplicação.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Enviado apenas em produção (HTTPS); em dev seria contraproducente.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/**
 * Origens externas liberadas para o otimizador de imagem.
 *
 * Com `STORAGE_DRIVER="s3"` os uploads passam a ser gravados no bucket e o
 * adapter devolve uma URL absoluta (`https://cdn.../uploads/x.jpg`), que vai
 * direto para o `src` de um `next/image`. O Next recusa qualquer host que não
 * esteja declarado aqui — então, sem isto, ligar o S3 quebrava toda imagem
 * enviada pelo painel, em runtime e só em produção.
 *
 * Derivar de `S3_PUBLIC_URL` evita a lista manual que ninguém lembra de
 * atualizar: quem configura o bucket já configurou o host.
 */
function remoteImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const publicUrl = process.env.S3_PUBLIC_URL?.trim();
  if (!publicUrl) return [];

  let parsed: URL;
  try {
    parsed = new URL(publicUrl);
  } catch {
    // Falhar no build é melhor que servir imagem quebrada em produção.
    throw new Error(
      `S3_PUBLIC_URL não é uma URL válida: ${JSON.stringify(publicUrl)}`,
    );
  }

  return [
    {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
      pathname: `${parsed.pathname.replace(/\/$/, "")}/**`,
    },
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    // AVIF primeiro: fotografia escura comprime bem melhor que em WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: remoteImagePatterns(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Uploads de clientes: nunca executar no navegador, sempre baixar.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
          { key: "Cache-Control", value: "private, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
