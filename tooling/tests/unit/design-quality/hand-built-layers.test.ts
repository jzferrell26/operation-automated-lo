import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-006d 006D-AC-003, the half the element scan could not see.
 *
 * `governed-controls.test.ts` reads the tags a screen spells, and a hand-built dialog does not
 * have to spell `<dialog>`. Until 2026-09-20 the application shell's mobile drawer was a plain
 * element wearing the dialog role and the modal flag, with its own focus trap, its own Escape
 * handler, its own scroll lock, and its own focus return: exactly the behaviour PRD-006d D4
 * line 88 names `Dialog` as generalising, and exactly what 006D-AC-003 says no screen may build
 * for itself. It passed the element scan because it spelled the role instead of the tag.
 *
 * So the ARIA spelling is read too, on any element, under the same roots. `Dialog` and `Sheet`
 * set the role inside `packages/ui`, which neither scan reads, so a screen that uses the
 * primitives has nothing here to trip over and a screen that builds its own layer has no spelling
 * left that hides it.
 *
 * This is a file of its own rather than another case inside the element scan, because the two
 * answer different questions about different things: one is about which tag paints a control, and
 * this one is about which component owns a focus contract. A failure here is read differently too:
 * the fix is never a different tag, it is `Dialog` or `Sheet`.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

/** The same roots the element scan reads: everything that can paint a screen. */
const SCANNED_ROOTS: readonly string[] = ["apps/web/src/app", "apps/web/src/features"];

const LAYER_SPELLINGS: readonly Readonly<{ pattern: RegExp; instead: string }>[] = [
  { pattern: /role="dialog"/gu, instead: "Dialog, or Sheet for a non-modal panel" },
  { pattern: /role="alertdialog"/gu, instead: "Dialog with urgent" },
  { pattern: /aria-modal=/gu, instead: "Dialog, which owns aria-modal" },
];

async function screenFiles(): Promise<readonly string[]> {
  const found: string[] = [];
  for (const root of SCANNED_ROOTS) {
    for (const entry of await readdir(join(repositoryRoot, root), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile() || extname(entry.name) !== ".tsx") continue;
      if (entry.name.includes(".test.")) continue;
      found.push(join(entry.parentPath, entry.name));
    }
  }
  return found;
}

describe("the hand-built layer scan", () => {
  it("reads every screen file, so the result means something", async () => {
    expect((await screenFiles()).length).toBeGreaterThan(20);
  });

  it("finds no dialog role and no aria-modal outside the overlay primitives", async () => {
    const offenders: string[] = [];

    for (const file of await screenFiles()) {
      const source = await readFile(file, "utf8");
      const path = relative(repositoryRoot, file).replaceAll("\\", "/");
      for (const { pattern, instead } of LAYER_SPELLINGS) {
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split("\n").length;
          offenders.push(`${path}:${line} spells ${match[0]}; use ${instead}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("finds no second focus trap: only the primitive locks background scroll", async () => {
    const offenders: string[] = [];

    for (const file of await screenFiles()) {
      const source = await readFile(file, "utf8");
      const path = relative(repositoryRoot, file).replaceAll("\\", "/");
      /**
       * The shell's drawer wrote `document.body.style.overflow = "hidden"` itself. A scroll lock
       * outside `packages/ui` is a layer somebody built by hand, whatever it spells its role, and
       * it is the part of the contract that outlives a close when it goes wrong.
       */
      for (const match of source.matchAll(/document\.body\.style\.overflow/gu)) {
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${path}:${line} locks background scroll; Dialog already does`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
