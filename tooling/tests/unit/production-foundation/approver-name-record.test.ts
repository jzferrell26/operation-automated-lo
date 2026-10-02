import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009e D2, 009E-AC-004. The record checks of the decider's own name.
 *
 * The name a person typed at sign-up is copied into an append-only table, so it can never be
 * corrected or erased by the application, and it is personal data. The retention, deletion, and
 * export runbooks name it, as 006C-AC-021 names the setup profile. The decision to record it from
 * the decider's own session, and never to grant `app_runtime` a read of `platform.app_users` (which
 * has no location column, so a grant would expose every user's name across tenants), rests on the
 * pgTAP assertion that the grant is still absent, so that assertion is read here too.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

async function read(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), "utf8");
}

describe("the decider's name is named as personal data (009E-AC-004)", () => {
  it.each(["docs/operations/retention-and-deletion.md", "docs/operations/export.md"])(
    "%s names campaign.approval_decisions.snapshot.approverDisplayName and says why it cannot be changed",
    async (path) => {
      const text = await read(path);

      expect(text).toContain("`campaign.approval_decisions.snapshot.approverDisplayName`");
      expect(text).toMatch(/is personal data/u);
      expect(text).toContain("approval_decisions_append_only");
      expect(text).toContain("`actor_id` and `actor_role` stay the authoritative record");
      expect(text).toContain("migration login");
    },
  );

  it("says the same thing in both runbooks", async () => {
    const [retention, exported] = await Promise.all([
      read("docs/operations/retention-and-deletion.md"),
      read("docs/operations/export.md"),
    ]);
    const heading = "## The decider's name on an approval (PRD-009e D2)";

    expect(retention.slice(retention.indexOf(heading))).toBe(
      exported.slice(exported.indexOf(heading)),
    );
    expect(retention).toContain(heading);
  });
});

describe("the name is recorded without a read of platform.app_users (009E-AC-004)", () => {
  it("keeps the pgTAP assertion that app_runtime cannot select platform.app_users", async () => {
    const pgtap = await read("supabase/tests/first_party_sessions.pgtap.sql");

    expect(pgtap).toContain(
      "not has_table_privilege('app_runtime', 'platform.app_users', 'SELECT')",
    );
    expect(pgtap).toContain("'app runtime still cannot select platform.app_users'");
  });

  it("reads the name through the scoped session display function and nowhere else in the route", async () => {
    // Code only: the comments say why no grant is involved, and may name the table to say so.
    const handler = (await read("apps/web/src/server/campaign-approval-handler.ts"))
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/^\s*\/\/.*$/gmu, "");

    expect(handler).toContain("ports.sessionDisplay");
    expect(handler).not.toMatch(/platform\.app_users/u);
    expect(handler).not.toMatch(/parsed\.approverDisplayName|body\.approverDisplayName/u);
  });
});
