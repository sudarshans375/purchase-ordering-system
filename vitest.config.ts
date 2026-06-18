// vitest.config.ts — Test configuration
// Author: Sudarshan Sonawane

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Cloud Postgres (Neon) connections can be slow on first hit.
    // Generous timeouts prevent spurious flakes on integration tests.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**", "src/services/**", "src/lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
