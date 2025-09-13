import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BloomIQ - AI-Powered Question Paper Generator",
  description: "Intelligent question paper generation platform for universities using AI, Bloom's taxonomy, and RAG pipeline for contextual academic content creation.",
  keywords: ["question paper generator", "AI education", "Bloom's taxonomy", "university assessment", "academic content", "RAG pipeline"],
  authors: [{ name: "BloomIQ Team" }],
  creator: "BloomIQ",
  publisher: "BloomIQ",
  robots: "index, follow",
  openGraph: {
    title: "BloomIQ - AI-Powered Question Paper Generator",
    description: "Intelligent question paper generation platform for universities using AI, Bloom's taxonomy, and RAG pipeline for contextual academic content creation.",
    type: "website",
    locale: "en_US",
    siteName: "BloomIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "BloomIQ - AI-Powered Question Paper Generator",
    description: "Intelligent question paper generation platform for universities using AI, Bloom's taxonomy, and RAG pipeline for contextual academic content creation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
