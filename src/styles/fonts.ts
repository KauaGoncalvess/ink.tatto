import { Anton, Inter } from "next/font/google";

/**
 * Par tipográfico do estúdio, isolado num arquivo só para ser trocável.
 *
 * O contraste é proposital: um display condensado e pesado contra uma sans
 * neutra. É esse salto que dá a sensação editorial — a personalidade vem da
 * escala e do tracking, não de uma fonte decorativa.
 */

/** Display: só para títulos grandes em caixa alta (h1/h2 de seção). */
export const fontDisplay = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
  // Fallback métrico para evitar layout shift enquanto a fonte carrega.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

/** Texto e UI: corpo, rótulos, botões, tabelas. */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const fontClassNames = `${fontDisplay.variable} ${fontSans.variable}`;
