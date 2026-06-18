// src/app/not-found.tsx — 404 page
// Author: Sudarshan Sonawane

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900">
          <FileQuestion className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-mono text-zinc-500">404</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Page not found
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The page you were looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}