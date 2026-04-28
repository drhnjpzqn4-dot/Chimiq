import { defineConfig } from "vitest/config";
import path from "path";

// Standalone vitest config so the test runner doesn't try to load
// `vite.config.ts`, which throws when PORT isn't set (the dev-server
// guard). Tests are pure-Node units and never need the real dev server.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
