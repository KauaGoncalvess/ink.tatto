import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

/**
 * Imagem de compartilhamento (Open Graph / Twitter Card).
 *
 * Gerada em tempo de build pelo `next/og`, sem depender de nenhuma fotografia
 * — assim ela continua correta mesmo antes de o estúdio subir as fotos reais.
 * Reproduz os elementos da marca: preto profundo, o fio vermelho e o display
 * em caixa alta.
 */

export const alt = `${siteConfig.studioName} — ${siteConfig.studioTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(ellipse at 25% 20%, #221f1d 0%, #0d0d10 45%, #08080a 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 1.5 30.5 16 16 30.5 1.5 16 16 1.5Z"
              stroke="#c8102e"
              strokeWidth="1.25"
              opacity="0.45"
            />
            <path d="M16 6.5v13.2" stroke="#c8102e" strokeWidth="2.4" />
            <path d="M16 25.5 13.4 19.7h5.2L16 25.5Z" fill="#c8102e" />
          </svg>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 2,
                color: "#f2f0ed",
                textTransform: "uppercase",
              }}
            >
              {siteConfig.studioName}
            </span>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 8,
                color: "#6b6b73",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              {siteConfig.studioTagline}
            </span>
          </div>
        </div>

        {/* Título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: 96, height: 4, background: "#c8102e" }} />
          <span
            style={{
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -3,
              color: "#f2f0ed",
              textTransform: "uppercase",
              marginTop: 28,
            }}
          >
            Transforme sua
          </span>
          <span
            style={{
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -3,
              color: "#c8102e",
              textTransform: "uppercase",
            }}
          >
            história em arte.
          </span>
        </div>

        {/* Rodapé */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 22, color: "#a8a8b0" }}>
            {siteConfig.contact.address.district} · {siteConfig.contact.address.city}
          </span>
          <span
            style={{
              fontSize: 18,
              letterSpacing: 4,
              color: "#6b6b73",
              textTransform: "uppercase",
            }}
          >
            Agendamento online
          </span>
        </div>
      </div>
    ),
    size,
  );
}
