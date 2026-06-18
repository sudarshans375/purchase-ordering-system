// src/components/ui/search-input.tsx — Search input with built-in debounce + clear button
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** Debounce ms; set to 0 to fire on every keystroke. */
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  debounceMs = 300,
  className,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  const [internal, setInternal] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep internal in sync if parent value changes externally.
  React.useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setInternal(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceMs > 0) {
        timerRef.current = setTimeout(() => onChange(next), debounceMs);
      } else {
        onChange(next);
      }
    },
    [onChange, debounceMs]
  );

  const handleClear = React.useCallback(() => {
    setInternal("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
    onClear?.();
  }, [onChange, onClear]);

  // Cleanup pending timer on unmount.
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
      <input
        type="search"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-white dark:bg-zinc-900 pl-9 pr-9 py-2 text-sm",
          "border-zinc-200 dark:border-zinc-800",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
          "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
        )}
        {...props}
      />
      {internal && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}