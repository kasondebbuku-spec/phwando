import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Read only TEST_DATABASE_URL from .env, so tests never touch the dev database by accident.
const { TEST_DATABASE_URL } = { ...loadEnv("test", process.cwd(), "TEST_"), ...process.env };

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: TEST_DATABASE_URL ? { TEST_DATABASE_URL } : {},
    // Database tests share one Postgres database, so run files one at a time.
    fileParallelism: false,
  },
});
