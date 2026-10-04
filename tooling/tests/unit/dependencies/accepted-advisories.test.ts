import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 security close-out, SEC-009-01 and SEC-009-12. The owner accepted one dev-only advisory on
 * 2026-10-03 while no fixed version exists. `pnpm audit` reads everything under `auditConfig` in
 * `pnpm-workspace.yaml` (`ignoreGhsas` and `ignoreCves` both silence an advisory everywhere), so this
 * test reads every entry under that key, blank lines and comments included, and holds the whole block
 * to the accepted entry with its dated reason beside it. A second ignore, under either key, cannot be
 * added without changing this file too.
 */
const ACCEPTED: Readonly<Record<string, readonly string[]>> = {
  ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm"],
};

/** The owner's revisit date: the day to look for a fixed braces and drop the entry, or decide again. */
const REVISIT_DATE = "2026-11-03";

const workspace = await readFile(
  resolve(import.meta.dirname, "../../../../pnpm-workspace.yaml"),
  "utf8",
);

/** A YAML comment starts at a `#` that opens the line or follows whitespace. */
const COMMENT = /(?:^|\s)#.*$/u;

/** One list item as YAML writes it: the quotes around a scalar are not part of its value. */
function scalar(raw: string): string {
  return raw.trim().replace(/^(["'])(.*)\1$/u, "$2");
}

/** The items of a flow list, `[a, "b"]`, or `undefined` when the value is not one. */
function flowList(value: string): string[] | undefined {
  const inner = /^\[(.*)\]$/u.exec(value)?.[1];
  if (inner === undefined) return undefined;
  return inner
    .split(",")
    .map(scalar)
    .filter((item) => item !== "");
}

/**
 * Every entry under the top-level `auditConfig` key, by key name, in file order. It reads block and
 * flow lists, skips blank lines and comments anywhere in the block, and stops at the next top-level
 * key. A line it cannot read as a key, a list item, or a comment is an error, not something skipped,
 * so a shape this reader does not know fails the test instead of passing it. No `auditConfig` key
 * reads as an empty config.
 */
function auditConfig(text: string): Record<string, string[]> {
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => /^auditConfig\s*:/u.test(line));
  const config: Record<string, string[]> = {};
  if (start < 0) return config;
  if (!/^auditConfig\s*:\s*(?:#.*)?$/u.test(lines[start] ?? "")) {
    throw new Error("auditConfig is not a block: this test reads only the block form");
  }
  let key: string | undefined;
  let keyIndent: number | undefined;
  for (const line of lines.slice(start + 1)) {
    const content = line.replace(COMMENT, "");
    if (content.trim() === "") continue;
    if (/^\S/u.test(content)) break;
    const entry = /^(\s+)([A-Za-z][\w-]*)\s*:\s*(.*)$/u.exec(content);
    if (entry !== null) {
      // Sibling keys share one indent; a deeper "key" is a nested map this reader does not know.
      keyIndent ??= (entry[1] ?? "").length;
      if ((entry[1] ?? "").length !== keyIndent) {
        throw new Error(`unreadable line under auditConfig: ${line.trim()}`);
      }
      key = entry[2] ?? "";
      const value = (entry[3] ?? "").trim();
      const items = value === "" ? [] : flowList(value);
      if (items === undefined) throw new Error(`auditConfig.${key} is not a list: ${value}`);
      config[key] = [...(config[key] ?? []), ...items];
      continue;
    }
    const item = /^\s+-\s*(.+)$/u.exec(content);
    if (item === null || key === undefined) {
      throw new Error(`unreadable line under auditConfig: ${line.trim()}`);
    }
    config[key]?.push(scalar(item[1] ?? ""));
  }
  return config;
}

describe("advisories the audit is told to ignore", () => {
  it("ignores only the advisory the owner accepted, under every auditConfig key", () => {
    expect(auditConfig(workspace)).toEqual(ACCEPTED);
  });

  it("keeps the dated reason and the revisit date beside the entry", () => {
    expect(workspace).toContain(
      "Accepted 2026-10-03 by the owner (PRD-009 security close-out, SEC-009-01)",
    );
    expect(workspace).toContain(`Revisit ${REVISIT_DATE}`);
  });

  it("reads a second entry as a change to the list", () => {
    expect(
      auditConfig(
        "auditConfig:\n  ignoreGhsas:\n    - GHSA-aaaa-bbbb-cccc\n    - GHSA-dddd-eeee-ffff\n",
      ),
    ).toEqual({ ignoreGhsas: ["GHSA-aaaa-bbbb-cccc", "GHSA-dddd-eeee-ffff"] });
  });

  describe("sidesteps of the list, each read as a change (SEC-009-12)", () => {
    const accepted = "auditConfig:\n  ignoreGhsas:\n    - GHSA-vfj7-8cjw-p6xm\n";

    it("reads the accepted file as exactly the accepted entry", () => {
      expect(auditConfig(accepted)).toEqual(ACCEPTED);
    });

    it.each([
      ["a blank line, then a second GHSA", `${accepted}\n    - GHSA-aaaa-bbbb-cccc\n`],
      ["a comment line, then a second GHSA", `${accepted}    # note\n    - GHSA-aaaa-bbbb-cccc\n`],
      [
        "a blank line and a comment line, then a second GHSA",
        `${accepted}\n    # note\n\n    - GHSA-aaaa-bbbb-cccc\n`,
      ],
      ["a second GHSA with a trailing comment", `${accepted}    - GHSA-aaaa-bbbb-cccc # why\n`],
      ["a quoted second GHSA", `${accepted}    - "GHSA-aaaa-bbbb-cccc"\n`],
      [
        "Windows line endings",
        "auditConfig:\r\n  ignoreGhsas:\r\n    - GHSA-vfj7-8cjw-p6xm\r\n\r\n    - GHSA-aaaa-bbbb-cccc\r\n",
      ],
      ["an ignoreCves block list", `${accepted}  ignoreCves:\n    - CVE-2026-0001\n`],
      ["an ignoreCves flow list", `${accepted}  ignoreCves: [CVE-2026-0001]\n`],
      [
        "an ignoreCves key after a blank line",
        `${accepted}\n  ignoreCves:\n\n    - CVE-2026-0001\n`,
      ],
      [
        "an ignoreCves entry ahead of the GHSA",
        `auditConfig:\n  ignoreCves: [CVE-2026-0001]\n  ignoreGhsas:\n    - GHSA-vfj7-8cjw-p6xm\n`,
      ],
      ["an empty ignoreCves key", `${accepted}  ignoreCves: []\n`],
      [
        "a flow list of GHSAs",
        "auditConfig:\n  ignoreGhsas: [GHSA-vfj7-8cjw-p6xm, GHSA-aaaa-bbbb-cccc]\n",
      ],
      ["another auditConfig key", `${accepted}  ignoreUnfixable: [GHSA-aaaa-bbbb-cccc]\n`],
      [
        "the block between other top-level keys",
        `packages:\n  - apps/*\n\n${accepted}\n    - GHSA-aaaa-bbbb-cccc\nsaveExact: true\n`,
      ],
    ] as const)("reads %s", (_label, text) => {
      expect(auditConfig(text)).not.toEqual(ACCEPTED);
    });

    it("reads the added entry itself, whatever stands between it and the accepted one", () => {
      expect(auditConfig(`${accepted}\n    # note\n\n    - GHSA-aaaa-bbbb-cccc\n`)).toEqual({
        ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm", "GHSA-aaaa-bbbb-cccc"],
      });
      expect(auditConfig(`${accepted}  ignoreCves:\n\n    - CVE-2026-0001\n`)).toEqual({
        ignoreGhsas: ["GHSA-vfj7-8cjw-p6xm"],
        ignoreCves: ["CVE-2026-0001"],
      });
    });

    it("does not read another top-level key's list as an ignore, and tolerates comments around it", () => {
      expect(
        auditConfig(
          `# a comment\npackages:\n  - apps/*\n${accepted}  # trailing note\n\nsaveExact: true\noverrides:\n  - not-an-ignore\n`,
        ),
      ).toEqual(ACCEPTED);
    });

    it("fails closed on a shape it cannot read", () => {
      expect(() => auditConfig("auditConfig: { ignoreGhsas: [GHSA-aaaa-bbbb-cccc] }\n")).toThrow(
        "not a block",
      );
      expect(() => auditConfig("auditConfig:\n  ignoreGhsas: GHSA-aaaa-bbbb-cccc\n")).toThrow(
        "not a list",
      );
      expect(() => auditConfig("auditConfig:\n    - GHSA-aaaa-bbbb-cccc\n")).toThrow(
        "unreadable line",
      );
      expect(() => auditConfig("auditConfig:\n  ignoreGhsas:\n    nested: [x]\n")).toThrow(
        "unreadable line",
      );
    });

    it("reads no auditConfig key as an ignore of nothing, which this file's accepted entry then fails", () => {
      expect(auditConfig("packages:\n  - apps/*\n")).toEqual({});
      expect(auditConfig("packages:\n  - apps/*\n")).not.toEqual(ACCEPTED);
    });
  });
});
