import type { Metadata } from "next";
import { Space_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SiteContentProvider } from "@/components/SiteContentProvider";
import { getSiteContent } from "@/lib/content-server";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Vandilson Neto — Site Oficial",
    template: "%s — Vandilson Neto",
  },
  description:
    "Site oficial de Vandilson Neto. Música, vídeos, biografia e agenda de shows. Sons que atravessam o mundo.",
  keywords: ["Vandilson Neto", "música", "artista", "shows", "álbum", "single"],
  openGraph: {
    title: "Vandilson Neto — Site Oficial",
    description: "Música, vídeos, biografia e agenda de shows.",
    type: "website",
    locale: "pt_PT",
    siteName: "Vandilson Neto",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vandilson Neto — Site Oficial",
    description: "Música, vídeos, biografia e agenda de shows.",
  },
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Conteúdo real (Supabase) montado no servidor e partilhado por SSR —
  // os componentes consomem-no via useSiteContent(), sem fetch no cliente.
  const content = await getSiteContent();

  return (
    <html lang="pt" className={`${grotesk.variable} ${playfair.variable}`}>
      <body className="film-grain flex min-h-screen flex-col bg-night-950 text-cream">
        <SiteContentProvider initial={content}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SiteContentProvider>
      </body>
    </html>
  );
}
