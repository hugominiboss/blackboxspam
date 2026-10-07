import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'BlackBox Vault — Ecossistema de Escala',
  description: 'Academia, Ferramentas e gestão de créditos via License Key.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${interFont.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full max-w-full overflow-x-clip flex flex-col">{children}</body>
    </html>
  );
}
