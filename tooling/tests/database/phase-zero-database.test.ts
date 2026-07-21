import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("Phase 0 database boundary", () => {
  it("keeps the local Supabase seed data-less and synthetic-only", async () => {
    const [config, seed] = await Promise.all([
      readFile("supabase/config.toml", "utf8"),
      readFile("supabase/seed.sql", "utf8"),
    ]);

    expect(config).toContain("Phase 0 local-only Supabase configuration");
    expect(config).toContain('project_id = "operation-automated-lo-phase-0"');
    expect(seed).toContain("synthetic-only");
    expect(seed).not.toMatch(/insert\s+into/iu);
  });
});
