import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"
import { TRPCReactProvider } from "@/trpc/client";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bloom IQ - AI Question Paper Generator",
  description: "Proprietary college software for generating question papers using AI and Bloom's Taxonomy",
  applicationName:"Bloom-Iq",
  authors:[{name:"Yashwanth Aravind"},{name:"Aakash U"},{name:"Anisha M"},{name:"Sushmitha"}],
  category:"Education",
  creator:"Yashwanth Aravind, Aakash, Anisha and Sushmitha",
  keywords:["question paper generator","blooms taxonomy","question generation system","ai based question generation system", "ai based questions"
  ],
  publisher:"Kalasalingam Academy of Research and Education"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <main>
          {children}
          </main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}