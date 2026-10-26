import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Chá missionário do Elder Modesto: veja os itens da lista, contribua e confirme sua presença. Dia 05/11 às 18:30.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lista Missionária | Elder Modesto",
  description,
  openGraph: {
    title: "Convite missionário: Elder Modesto",
    description,
    type: "website",
    locale: "pt_BR",
    siteName: "Lista Vinicius Modesto",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
