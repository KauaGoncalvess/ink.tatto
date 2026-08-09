import type { Metadata, Viewport } from "next";

import { fontClassNames } from "@/styles/fonts";
import { siteConfig } from "@/config/site";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.studioName} — ${siteConfig.studioTagline} em ${siteConfig.contact.address.city}`,
    template: `%s · ${siteConfig.studioName}`,
  },
  description: siteConfig.studioDescription,
  applicationName: siteConfig.studioName,
  keywords: [
    "estúdio de tatuagem",
    "tatuagem São Paulo",
    "tatuador",
    "realismo",
    "blackwork",
    "fine line",
    "piercing",
    "agendamento de tatuagem",
  ],
  authors: [{ name: siteConfig.studioName }],
  creator: siteConfig.studioName,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: siteConfig.studioName,
    title: `${siteConfig.studioName} — ${siteConfig.studioTagline}`,
    description: siteConfig.studioDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.studioName} — ${siteConfig.studioTagline}`,
    description: siteConfig.studioDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
  formatDetection: { telephone: true, address: true, email: true },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Sem maximumScale: limitar o zoom quebra a acessibilidade para quem
  // depende de ampliação.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={fontClassNames} suppressHydrationWarning>
      <head>
        {/*
          Marca que o JavaScript está ativo ANTES da primeira pintura. As
          animações de entrada (globals.css) só escondem o conteúdo quando esta
          classe existe — assim, se o JS falhar ou estiver desligado, a página
          aparece inteira em vez de ficar em branco abaixo do hero.
          Precisa ser inline e síncrono: um efeito no React rodaria tarde
          demais e causaria um flash de conteúdo.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js-reveal")`,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
