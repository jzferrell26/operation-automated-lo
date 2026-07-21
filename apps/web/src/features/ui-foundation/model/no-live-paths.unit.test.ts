import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ownedSources = [
  "apps/web/src/features/ui-foundation/data/load-synthetic-ui.ts",
  "apps/web/src/fixtures/ui-foundation/synthetic-ui.ts",
];

describe("synthetic data source isolation", () => {
  it.each(ownedSources)("contains no provider, network, or browser-storage path in %s", (file) => {
    const source = readFileSync(resolve(file), "utf8");

    expect(source).not.toMatch(/\bfetch\s*\(/u);
    expect(source).not.toMatch(/XMLHttpRequest|sendBeacon|localStorage|sessionStorage/u);
    expect(source).not.toMatch(/@oalo\/(ghl|billing|storage)|stripe|supabase/u);
  });
});
