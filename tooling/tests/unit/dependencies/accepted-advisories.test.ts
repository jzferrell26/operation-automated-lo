import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 security close-out, SEC-009-01. The owner accepted one dev-only advisory on 2026-10-03
 * while no fixed version exists. `pnpm audit` reads `auditConfig.ignoreGhsas` from
 * `pnpm-workspace.yaml`, so an entry there silences an advisory everywhere. This test keeps that
 * list to the accepted entry, with its dated reason beside it, so a second ignore cannot be added
 * without changing this file too.
 */
const ACCEPTED: readonly string[] = ["GHSA-vfj7-8cjw-p6xm"];

const workspace = await readFile(
  resolve(import.meta.dirname, "../../../../pnpm-workspace.yaml"),
  "utf8",
);

function ignoredAdvisories(text: string): string[] {
  const lines = text.split(/?
/u);
  const at = lines.findIndex((line) => /^s+ignoreGhsas:s*$/u.test(line));
  if (at < 0) return [];
  const ids: string[] = [];
  for (const line of lines.slice(at + 1)) {
    const item = /^s+-s*(S+)s*$/u.exec(line);
    if (item === null) break;
    ids.push(item[1] ?? "");
  }
  return ids;
}

describe("advisories the audit is told to ignore", () => {
  it("ignores only the advisory the owner accepted", () => {
    expect(ignoredAdvisories(workspace)).toEqual(ACCEPTED);
  });

  it("keeps the dated reason beside the entry", () => {
    expect(workspace).toContain(
      "Accepted 2026-10-03 by the owner (PRD-009 security close-out, SEC-009-01)",
    );
  });

  it("reads a second entry as a change to the list", () => {
    expect(
      ignoredAdvisories(
        "auditConfig:\n  ignoreGhsas:\n    - GHSA-aaaa-bbbb-cccc\n    - GHSA-dddd-eeee-ffff\n",
      ),
    ).toEqual(["GHSA-aaaa-bbbb-cccc", "GHSA-dddd-eeee-ffff"]);
  });
});
