// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://felpuditos.com.mx"), // o tu dominio .vercel.app
  title: { default: "Felpuditos", template: "%s | Felpuditos" },
  description: "Stickers personalizados.",
  openGraph: {
    title: "Felpuditos — stickers personalizados",
    description: "Pide tus stickers personalizados.",
    url: "https://felpuditos.com.mx",
    siteName: "Felpuditos",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Felpuditos" }],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Felpuditos — stickers personalizados",
    description: "Pide tus stickers personalizados.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
