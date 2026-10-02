import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009b source scans.
 *
 * 009B-AC-005: nothing in the Home feature reads the browser's storage. The checklist is what the
 * saved records say, and a script that remembered a click would let the card claim progress nobody
 * made (the evidence rule of `library/knowledge/private/ux-ui/03-components/onboarding-checklist.md`).
 *
 * 009B-AC-011: the floating walkthrough is gone from the product. Its provider, panel, steps, chip,
 * panel placement, anchor registry, and the help menu's "Show me around again" are removed in two
 * parts (D4): this lane removes every use in Wave 2, and the Wave 3 cleanup deletes the folder
 * itself once both lanes have merged. Until then the folder is on a ratchet list, the way
 * `open-house-boost-retired.test.ts` handles its own two-wave removal: a file that is not listed has
 * to be clean, a listed file that has gone fails the second test until its row is deleted, so the
 * list only ever gets shorter, and the criterion is met when it is empty.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
const WEB_SOURCE = "apps/web/src";

async function sourceFiles(
  root: string,
  extensions: readonly string[],
): Promise<readonly string[]> {
  const entries = await readdir(join(repositoryRoot, root), {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && extensions.includes(extname(entry.name)))
    .map((entry) =>
      relative(repositoryRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    )
    .filter(
      (path) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path) && !/\.test-support\./u.test(path),
    )
    .toSorted();
}

/** A comment is not code, and Home's own files say what they replaced in theirs. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "");
}

const BROWSER_STORAGE = /\b(?:localStorage|sessionStorage|indexedDB|IDBFactory|openDatabase)\b/u;

const HOME_FILES = [
  "apps/web/src/features/overview",
  "apps/web/src/app/(authenticated)/overview",
] as const;
const HOME_SINGLE_FILES = [
  "apps/web/src/server/home-reads.ts",
  "apps/web/src/copy/home-messages.ts",
] as const;

describe("009B-AC-005: Home reads nothing from the browser", () => {
  it("finds no localStorage, sessionStorage, or IndexedDB in the Home feature", async () => {
    const files = [
      ...(await Promise.all(HOME_FILES.map((root) => sourceFiles(root, [".ts", ".tsx"])))).flat(),
      ...HOME_SINGLE_FILES,
    ];
    expect(files.length).toBeGreaterThan(8);

    const offenders: string[] = [];
    for (const path of files) {
      const source = withoutComments(await readFile(join(repositoryRoot, path), "utf8"));
      if (BROWSER_STORAGE.test(source)) offenders.push(path);
    }

    expect(offenders).toEqual([]);
  });

  it("is a scan that can fail", () => {
    expect(BROWSER_STORAGE.test('window.localStorage.setItem("done", "1")')).toBe(true);
    expect(BROWSER_STORAGE.test("const db = indexedDB.open('x')")).toBe(true);
    expect(BROWSER_STORAGE.test("sessionStorage.getItem('x')")).toBe(true);
    expect(BROWSER_STORAGE.test("const stored = readSavedRecord()")).toBe(false);
  });
});

/**
 * What the walkthrough was made of, as it shows in source: its provider and hook, the shell's
 * controls for it, its anchors, its panel placement, and the two strings a person could click.
 */
const WALKTHROUGH =
  /GuidedSetupProvider|useGuidedSetup|GuidedSetupShellControls|GUIDED_SETUP_ANCHORS|guided-setup-provider|guided-setup-progress|guided-setup-step|guided-setup-context|anchor-registry|panel-placement|guided-setup\.module|guided-setup-messages|guided-setup\/model\/(?:progress|campaign-result)|GUIDED_SETUP_PREFERENCE_KEY|GuidedSetupProgress|SetupCampaignResult|data-tour|data-guided-setup|Show me around again|Finish setup/u;

/**
 * Where walkthrough code may still be, until the Wave 3 cleanup deletes it (D4): the whole guided
 * setup folder except the saved profile model, which stays, and its messages file. Each row is a
 * prefix.
 */
const PENDING_WAVE_3: readonly string[] = [
  "apps/web/src/features/guided-setup/",
  "apps/web/src/copy/guided-setup-messages.ts",
];

/** What D4 keeps: the saved setup profile that prefills the Brand form (009B-AC-012). */
const KEPT = ["apps/web/src/features/guided-setup/model/profile.ts"] as const;

/**
 * Lane 009d owns `apps/web/src/features/campaigns/**` in Wave 2 and removes its own uses in the same
 * wave (D4). This lane cannot edit it, so the scan leaves it out until the Wave 3 cleanup, which
 * deletes this row with the folder.
 */
const OWNED_BY_009D_UNTIL_WAVE_3 = "apps/web/src/features/campaigns/";

function pending(path: string): boolean {
  return PENDING_WAVE_3.some((prefix) => path.startsWith(prefix));
}

describe("009B-AC-011: the walkthrough is gone", () => {
  it("finds no walkthrough code outside the folder the Wave 3 cleanup deletes", async () => {
    const offenders: string[] = [];
    for (const path of await sourceFiles(WEB_SOURCE, [".ts", ".tsx", ".css"])) {
      if (pending(path) || path.startsWith(OWNED_BY_009D_UNTIL_WAVE_3)) continue;
      const source = withoutComments(await readFile(join(repositoryRoot, path), "utf8"));
      if (WALKTHROUGH.test(source)) offenders.push(path);
    }

    expect(
      offenders,
      `These still use the walkthrough, which D4 retires:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps the saved profile model, which the Brand form prefills from", async () => {
    for (const path of KEPT) {
      await expect(readFile(join(repositoryRoot, path), "utf8")).resolves.toContain(
        "setup_profile.v1",
      );
    }
  });

  it("keeps the pending list to files that still exist, so it only ever gets shorter", async () => {
    const files = await sourceFiles(WEB_SOURCE, [".ts", ".tsx", ".css"]);
    const stale = PENDING_WAVE_3.filter((prefix) => !files.some((path) => path.startsWith(prefix)));

    expect(
      stale,
      `Delete these rows from PENDING_WAVE_3, they are gone:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it("is a scan that can fail", () => {
    expect(WALKTHROUGH.test("<GuidedSetupProvider enabled>")).toBe(true);
    expect(WALKTHROUGH.test("<button>Show me around again</button>")).toBe(true);
    expect(WALKTHROUGH.test('<div data-tour="setup-welcome" />')).toBe(true);
    expect(WALKTHROUGH.test("const profile = readSetupProfile()")).toBe(false);
  });
});
