import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

const workspaceResolve = {
  alias: {
    "@oalo/application": resolve("packages/application/src/index.ts"),
    "@oalo/config": resolve("packages/config/src/index.ts"),
    "@oalo/contracts": resolve("packages/contracts/src/index.ts"),
    "@oalo/domain": resolve("packages/domain/src/index.ts"),
    "@oalo/ghl": resolve("packages/ghl/src/index.ts"),
    "@oalo/rendering": resolve("packages/rendering/src/index.ts"),
    "@oalo/test-support": resolve("packages/test-support/src/index.ts"),
    "@oalo/ui": resolve("packages/ui/src/index.ts"),
  },
};

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: workspaceResolve,
  test: {
    projects: [
      {
        resolve: workspaceResolve,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "tooling/tests/unit/**/*.test.ts",
            "apps/web/src/**/*.unit.test.ts",
            "apps/web/src/theme/**/*.test.ts",
          ],
        },
      },
      {
        oxc: {
          jsx: {
            runtime: "automatic",
          },
        },
        resolve: workspaceResolve,
        test: {
          name: "integration",
          environment: "jsdom",
          include: [
            "tooling/tests/integration/**/*.test.ts",
            "apps/web/src/**/*.integration.test.tsx",
            "apps/web/src/theme/**/*.test.tsx",
          ],
          setupFiles: ["apps/web/src/testing/setup.ts"],
        },
      },
      {
        resolve: workspaceResolve,
        test: {
          name: "database",
          environment: "node",
          include: ["tooling/tests/database/**/*.test.ts"],
        },
      },
      {
        resolve: workspaceResolve,
        test: {
          name: "contracts",
          environment: "node",
          include: [
            "tooling/tests/contracts/**/*.test.ts",
            "tests/contracts/**/*.test.ts",
            "tests/security/**/*.test.ts",
          ],
        },
      },
      {
        resolve: workspaceResolve,
        test: {
          name: "visual",
          environment: "node",
          include: ["tests/visual/**/*.test.ts"],
        },
      },
      {
        resolve: workspaceResolve,
        test: {
          name: "e2e-preview",
          environment: "node",
          include: ["tooling/tests/e2e-preview/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/application/src/**/*.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    clearMocks: true,
    restoreMocks: true,
  },
});
