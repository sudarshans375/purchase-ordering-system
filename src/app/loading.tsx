// src/app/loading.tsx — Root loading state
// Author: Sudarshan Sonawane

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}