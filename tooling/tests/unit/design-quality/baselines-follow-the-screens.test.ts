import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009g, 009G-AC-003. No baseline shows a screen PRD-009 removed, no spec still names one, and
 * every picture that is kept comes as a whole set.
 *
 * PRD-009 removed the Reports page, the onboarding checklist, the open house create screen, the
 * guided-setup walkthrough and its "Finish setup" chip, and the left rail with its collapsed and
 * drawer states (PRD-009f D4). 144 of the 376 pictures that existed then drew those screens, and
 * each was deleted with the capture that drew it, by the lane that removed the screen. A deleted
 * picture comes back in one way: somebody runs the baseline workflow while a spec still captures the
 * screen, or restores an old file by hand. This is the check that says so, on any machine, before a
 * redraw is committed.
 *
 * It reads names, not pictures. What a picture shows is the scored review's job
 * (`library/knowledge/private/ux-ui/06-review-rubric.md`); this holds the inventory.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SCREENS_ROOT = join(repositoryRoot, "tests/visual/screens");
const PROJECTS = ["chromium", "review"] as const;

/** What PRD-009 removed, by the `<screen>--<state>` its baselines started with (009F D4). */
const REMOVED = Object.freeze([
  { screen: "reports", state: "default", count: 8, why: "the Reports page (OD-D)" },
  { screen: "onboarding", state: "default", count: 8, why: "the /onboarding checklist (009F D1)" },
  {
    screen: "campaign-create",
    state: undefined,
    count: 32,
    why: "the open house create screen, four states (009d)",
  },
  {
    screen: "guided-setup",
    state: undefined,
    count: 80,
    why: "the guided-setup walkthrough, ten states (009b D4)",
  },
  {
    screen: "shell",
    state: "finish-setup-chip",
    count: 8,
    why: "the walkthrough's chip in the top bar (009b D4)",
  },
  { screen: "shell", state: "collapsed-rail", count: 6, why: "the left rail (D-2, 009a)" },
  {
    screen: "shell",
    state: "mobile-drawer",
    count: 2,
    why: "the rail's mobile drawer (D-2, 009a)",
  },
] as const);

/** The total of the sets above, so the 144 of 009F D4 is a sum and not a number somebody typed. */
const DELETED_IN_TOTAL = REMOVED.reduce((sum, entry) => sum + entry.count, 0);

const FRAMES = ["1440", "1180", "768", "390"] as const;
const THEMES = ["light", "dark"] as const;
const NAME =
  /^(?<screen>[a-z0-9-]+)--(?<state>[a-z0-9-]+)--(?<frame>\d+)--(?<theme>light|dark)\.png$/u;

/**
 * Named states the product has at fewer than the eight frame-and-theme pictures, each with the exact
 * set it keeps and the reason. Everything else comes as eight.
 */
const REDUCED: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // One frame, because the sheet exists only below 720px (009A-AC-011).
  "review/shell--menu-sheet-open": ["390--light", "390--dark"],
  // The pair the criterion names: Home under the unverified-email notice, in Light (009G-AC-001).
  "chromium/design-surfaces--home-under-notice": ["1440--light", "390--light"],
});

async function baselines(project: (typeof PROJECTS)[number]): Promise<string[]> {
  return (await readdir(join(SCREENS_ROOT, project))).filter((name) => name.endsWith(".png"));
}

describe("the committed screen baselines (009G-AC-003)", () => {
  it("holds no picture of a screen PRD-009 removed", async () => {
    const found: string[] = [];
    for (const project of PROJECTS) {
      for (const name of await baselines(project)) {
        const match = NAME.exec(name);
        const screen = match?.groups?.["screen"];
        const state = match?.groups?.["state"];
        for (const removed of REMOVED) {
          if (
            screen === removed.screen &&
            (removed.state === undefined || state === removed.state)
          ) {
            found.push(`${project}/${name}: ${removed.why}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("knows the 144 pictures PRD-009f D4 deleted, and where each set came from", () => {
    expect(DELETED_IN_TOTAL).toBe(144);
    // 48 in the synthetic project's folder and 96 in the review project's, as the register says.
    const synthetic = REMOVED.filter((entry) =>
      ["reports", "onboarding", "campaign-create"].includes(entry.screen),
    );
    expect(synthetic.reduce((sum, entry) => sum + entry.count, 0)).toBe(48);
    expect(DELETED_IN_TOTAL - 48).toBe(96);
  });

  it("names every picture by screen, state, frame, and theme", async () => {
    const badlyNamed: string[] = [];
    for (const project of PROJECTS) {
      for (const name of await baselines(project)) {
        const match = NAME.exec(name);
        const frame = match?.groups?.["frame"];
        if (match === null || !(FRAMES as readonly string[]).includes(frame ?? "")) {
          badlyNamed.push(`${project}/${name}`);
        }
      }
    }
    expect(badlyNamed).toEqual([]);
  });

  /**
   * A kept screen is drawn at all four frames in both themes (009G-AC-001), so a set that is short
   * is a capture that stopped, a file that was deleted by hand, or a removed screen's leftovers.
   */
  it("keeps every named state as a whole set: four frames in two themes", async () => {
    const sets = new Map<string, Set<string>>();
    for (const project of PROJECTS) {
      for (const name of await baselines(project)) {
        const match = NAME.exec(name);
        if (match?.groups === undefined) continue;
        const key = `${project}/${match.groups["screen"] ?? ""}--${match.groups["state"] ?? ""}`;
        const frames = sets.get(key) ?? new Set<string>();
        frames.add(`${match.groups["frame"] ?? ""}--${match.groups["theme"] ?? ""}`);
        sets.set(key, frames);
      }
    }

    const whole = FRAMES.flatMap((frame) => THEMES.map((theme) => `${frame}--${theme}`)).sort();
    const short: string[] = [];
    for (const [key, pictures] of sets) {
      const expected = [...(REDUCED[key] ?? whole)].sort();
      if (JSON.stringify([...pictures].sort()) !== JSON.stringify(expected)) {
        short.push(`${key} has ${[...pictures].sort().join(", ")}`);
      }
    }
    expect(short).toEqual([]);
  });

  it("is named by no capture in any spec, helper, or fixture", async () => {
    const files = await sourceFilesUnder(join(repositoryRoot, "tests"));
    const naming: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const removed of REMOVED) {
        const screen = removed.screen;
        // `screen: "reports"` in a capture, or `screenshotName("reports", ...)`, or the file name.
        const patterns = [
          new RegExp(String.raw`screen:\s*["']${screen}["']`, "u"),
          new RegExp(String.raw`screenshotName\(\s*["']${screen}["']`, "u"),
          new RegExp(
            String.raw`\b${screen}--(?:${removed.state ?? "[a-z0-9-]+"})--\d+--(?:light|dark)`,
            "u",
          ),
        ];
        // `shell` is a screen that stays; only its removed states are named here.
        const named =
          removed.screen === "shell"
            ? new RegExp(String.raw`state:\s*["']${removed.state ?? ""}["']`, "u").test(source)
            : patterns.some((pattern) => pattern.test(source));
        if (named) {
          naming.push(
            `${relative(repositoryRoot, file).replaceAll("\\", "/")} names ${removed.screen}${removed.state === undefined ? "" : `--${removed.state}`}`,
          );
        }
      }
    }
    // This file names the removed screens by design, as data.
    expect(naming.filter((entry) => !entry.startsWith("tooling/"))).toEqual([]);
  });
});

async function sourceFilesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, item.name);
    if (item.isDirectory()) {
      if (item.name === "screens" || item.name === "node_modules") continue;
      found.push(...(await sourceFilesUnder(target)));
    } else if (item.isFile() && /\.(?:ts|tsx|mts|mjs)$/u.test(item.name)) {
      found.push(target);
    }
  }
  return found;
}
