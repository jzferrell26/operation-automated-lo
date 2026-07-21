import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { FixtureValidationRequestSchema } from "@oalo/contracts";

const execFileAsync = promisify(execFile);

describe("versioned contract boundaries", () => {
  it("accepts only the versioned fixture-only task payload", () => {
    expect(
      FixtureValidationRequestSchema.parse({
        schemaVersion: 1,
        fixtureSet: "rendering-v1",
      }),
    ).toEqual({ schemaVersion: 1, fixtureSet: "rendering-v1" });
    expect(
      FixtureValidationRequestSchema.safeParse({
        schemaVersion: 2,
        fixtureSet: "production",
      }).success,
    ).toBe(false);
  });

  it("rejects the deliberate reverse-dependency fixture", async () => {
    const result = await execFileAsync(
      process.execPath,
      [
        "tooling/scripts/audit-boundaries.mjs",
        "--assert-reject",
        "tooling/fixtures/boundaries/reverse-dependency.json",
      ],
      { cwd: process.cwd() },
    );

    expect(result.stdout).toContain("Boundary fixture rejected 2 prohibited edges.");
  });

  it("rejects unapproved fixture paths before filesystem access", async () => {
    await expect(
      execFileAsync(
        process.execPath,
        ["tooling/scripts/audit-boundaries.mjs", "--assert-reject", "../outside.json"],
        { cwd: process.cwd() },
      ),
    ).rejects.toThrow();
  });
});
