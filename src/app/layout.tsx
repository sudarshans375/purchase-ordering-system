// src/app/layout.tsx — Root layout (minimal)
// Author: Sudarshan Sonawane

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Purchase Ordering System",
  description:
    "A production-grade purchase ordering module for small businesses. " +
    "Manage suppliers, products, purchase orders, and inventory with confidence.",
  authors: [{ name: "Sudarshan Sonawane" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gradient-to-br from-zinc-50 to-zinc-100/50 font-sans text-zinc-900">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
