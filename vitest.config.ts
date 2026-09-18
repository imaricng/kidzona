import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

/** Testovi koriste isti "@/..." alias kao aplikacija (vidi tsconfig.json). */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
