import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"
import { TRPCReactProvider } from "@/trpc/client";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bloom IQ - AI Question Paper Generator",
  description: "Proprietary college software for generating question papers using AI and Bloom's Taxonomy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>
      <html lang="en">
        <body
          className={`${inter.variable} font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </TRPCReactProvider>
  );
}
