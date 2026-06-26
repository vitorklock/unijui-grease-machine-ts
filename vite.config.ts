import { fileURLToPath } from "node:url";

/**
 * Minimal config so `vite-node` resolves the `@/*` path alias when running the
 * scripts in `scripts/` (e.g. `pnpm script export-paper-data`). Next.js ignores
 * this file; Vitest keeps using `vitest.config.ts` (same alias, so merging is a
 * no-op). A plain object (no `defineConfig` import) keeps vite-node from warning
 * about an unresolved `vite` import while loading the config.
 */
const config = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
};

export default config;
