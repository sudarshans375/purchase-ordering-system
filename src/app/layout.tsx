// src/app/layout.tsx — Root layout
// Author: Sudarshan Sonawane

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
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
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <QueryProvider>
          <div className="min-h-screen lg:flex">
            <Navbar />
            <main className="flex-1 lg:ml-0 pb-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {children}
              </div>
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
