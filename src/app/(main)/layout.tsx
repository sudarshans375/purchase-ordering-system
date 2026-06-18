// src/app/(main)/layout.tsx — Main layout with sidebar
// Author: Sudarshan Sonawane

import { Navbar } from "@/components/layout/navbar";
import { CommandPalette } from "@/components/command-palette";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <Navbar />
      <main
        id="main-content"
        className="flex-1 lg:ml-0 pb-16 lg:pb-8 min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
