import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança.
 *
 * Não há CSP aqui de propósito: o Next injeta estilos e scripts inline no
 * runtime do App Router, e uma CSP correta exige nonce por requisição via
 * middleware. Um `script-src 'unsafe-inline'` daria a falsa sensação de
 * proteção sem proteger de fato. Os cabeçalhos abaixo são os que valem sem
 * ressalva; a CSP com nonce fica documentada no README como próximo passo.
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

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    // AVIF primeiro: fotografia escura comprime bem melhor que em WebP.
    formats: ["image/avif", "image/webp"],
    // Todas as imagens são locais (/public). Se um dia forem servidas de um
    // bucket, declare o host aqui — o Next bloqueia origens não listadas.
    remotePatterns: [],
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
