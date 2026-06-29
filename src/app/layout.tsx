import type { Metadata, Viewport } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Serif de alto contraste para títulos (raíz editorial elegante)
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

// Grotesque limpia y caracterful para cuerpo
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aynai.example"),
  title: "AYNAI — Tu talento vale. Demuéstralo.",
  description:
    "AYNAI es el marketplace donde intercambias habilidades y construyes una reputación verificable que nadie puede falsificar. Comisión justa, sin bancos, reputación on-chain.",
  keywords: [
    "marketplace de habilidades",
    "reputación verificable",
    "freelance Bolivia",
    "AYNAI Score",
    "economía del talento",
    "trueque de habilidades",
  ],
  authors: [{ name: "Equipo AYNAI" }],
  openGraph: {
    title: "AYNAI — Tu talento vale. Demuéstralo.",
    description:
      "El marketplace donde tu reputación es tuya de verdad. Intercambia habilidades y construye un AYNAI Score verificable.",
    type: "website",
    locale: "es_BO",
    siteName: "AYNAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "AYNAI — Tu talento vale. Demuéstralo.",
    description: "El marketplace de habilidades con reputación verificable on-chain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a0a00",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${playfair.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
