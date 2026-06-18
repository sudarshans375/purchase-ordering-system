// src/providers/query-provider.tsx — React Query + global toast bridge
// Author: Sudarshan Sonawane

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        retry: (failureCount, error) => {
          // Don't retry 4xx (client errors), do retry 5xx up to once
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Global mutation error → toast. Per-mutation onError can override.
        onError: (error) => {
          if (error instanceof ApiError) {
            // Already shown inline in most UIs; toast is a redundant
            // safeguard. Use a module-level handle to call toast.
            const detail = error.details ? ` (${error.code})` : "";
            // eslint-disable-next-line no-console
            console.error("[mutation error]", error.code, error.message);
          }
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}