import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/components/**/*.test.ts", "src/components/**/*.test.tsx"],
  },
});
