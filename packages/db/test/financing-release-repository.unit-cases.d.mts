export function runFinancingReleaseAdapterCases(
  db: typeof import("../src/index.js"),
  app: typeof import("../../application/src/index.js"),
  testkit: {
    describe(name: string, run: () => void): unknown;
    it(name: string, run: () => unknown | Promise<unknown>): unknown;
  },
): void;
