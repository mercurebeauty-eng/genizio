// Deliberately separate from vite.config.ts: that config is managed by
// @lovable.dev/vite-tanstack-config and its own comments warn against adding
// plugins (TanStack Start route generation, SSR, PWA, etc. are already baked
// in and duplicate registration breaks the app). None of that is needed to
// unit-test plain TypeScript functions, so this file only resolves the "@/"
// alias used across src/ and leaves the app's build config untouched.
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
