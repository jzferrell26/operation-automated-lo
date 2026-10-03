import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import ts from "typescript-compat";
import { describe, expect, it } from "vitest";

import nextConfig from "../../../../apps/web/next.config.js";

/**
 * PRD-009f D4 and 009F-AC-005, the standing half. The removals leave no link to a removed address
 * anywhere in `apps/web/src`.
 *
 * Until this file there was no scan for the whole tree: a link to `/leads` planted in a module no
 * page renders left every test green (the pre-redraw verification, S-1, F1s and F1k). The Home, the
 * Campaigns pages, the library, and the navigation each had a scan of their own files, so a link in
 * any other file was unguarded.
 *
 * The removed addresses are read from where the app keeps them, not copied here: the sources of the
 * redirect table in `apps/web/next.config.ts` (the fate D1 gives each moved address) and the pages
 * under `apps/web/src/app/(gone)` (the three CRM addresses that answer 404). A removal added to
 * either is covered the moment it lands.
 *
 * It reads the TypeScript syntax tree and checks every string and template piece, so a comment that
 * records a removal is not a link, and a link written as `href="/leads"`, `Link href={"/leads"}`,
 * `redirect("/leads")`, `` `/leads/${id}` `` or `` `${base}/leads` `` is. The three kinds of file it
 * leaves out are named in `EXCLUDED` with the reason, because each has to name the addresses.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SOURCE_ROOT = resolve(repositoryRoot, "apps/web/src");
const GONE_ROOT = join(SOURCE_ROOT, "app/(gone)");

/**
 * The one removed address that is a prefix of kept addresses: "/marketing" is the hub that moved,
 * "/marketing/campaigns" is where it moved to. Only the bare address is a link to the hub.
 */
const HUB = "/marketing";

const SCANNED_EXTENSIONS: readonly string[] = [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"];

/** Paths the scan does not read, each with its reason. Anything not listed here is scanned. */
const EXCLUDED: readonly Readonly<{ matches: (path: string) => boolean; because: string }>[] = [
  {
    matches: (path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path),
    because:
      "A test asserts the redirect, the gone page, or that no link exists, so it names them.",
  },
  {
    matches: (path) => path.startsWith("app/(gone)/"),
    because:
      "The gone pages and their not-found page are the tombstones: they say where the work went.",
  },
  {
    matches: (path) => path.endsWith(".d.ts"),
    because: "Declarations hold types, not links.",
  },
];

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => posix(relative(directory, join(entry.parentPath, entry.name))))
    .sort();
}

/** Every removed D4 address: the redirect table's sources and the gone pages' own addresses. */
async function removedAddresses(): Promise<readonly string[]> {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const gone = (await filesUnder(GONE_ROOT))
    .filter((file) => file === "page.tsx" || file.endsWith("/page.tsx"))
    .map((file) => posix(dirname(file)))
    .filter((directory) => directory !== ".")
    .map((directory) => `/${directory}`);
  return [...new Set([...redirects.map((rule) => rule.source), ...gone])].sort();
}

/**
 * The removed address a string or template piece links to, or `undefined`. The query and fragment
 * are ignored and so is one trailing slash. A removed address and anything below it is a link to it
 * ("/leads/pipeline", "/reports/abc"), except the hub, where only the bare address is, because
 * "/marketing/campaigns" is kept. A piece that is followed by an expression ("/leads/" in
 * `/leads/${id}`) is open ended: it links to what it starts, and never to the hub.
 */
function removedAddressOf(
  text: string,
  openEnded: boolean,
  addresses: readonly string[],
): string | undefined {
  if (!text.startsWith("/")) return undefined;
  const path = (text.split(/[?#]/u, 1)[0] ?? "").replace(/(?<=.)\/$/u, "");
  // The longest address first, so "/leads/pipeline" is reported as itself and not as "/leads".
  return [...addresses]
    .sort((a, b) => b.length - a.length)
    .find((address) => {
      if (address === HUB) return !openEnded && path === address;
      return path === address || path.startsWith(`${address}/`);
    });
}

type Hit = Readonly<{ address: string; text: string; line: number }>;

/** Every link to a removed address in one file's code (comments are not nodes, so not read). */
function findRemovedLinks(
  sourceText: string,
  fileName: string,
  addresses: readonly string[],
): Hit[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hits: Hit[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isTemplateLiteralToken(node)) {
      const openEnded = ts.isTemplateHead(node) || ts.isTemplateMiddle(node);
      const address = removedAddressOf(node.text, openEnded, addresses);
      if (address !== undefined) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        hits.push({ address, text: node.text, line: line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

/** The files the standing scan reads: everything under `apps/web/src` that is not excluded. */
async function scannedFiles(): Promise<string[]> {
  return (await filesUnder(SOURCE_ROOT)).filter(
    (path) =>
      SCANNED_EXTENSIONS.some((extension) => path.endsWith(extension)) &&
      !EXCLUDED.some((rule) => rule.matches(path)),
  );
}

describe("the removed addresses are read from the app, not copied (009F-AC-005)", () => {
  it("holds the redirect table's sources and the gone pages' addresses", async () => {
    const addresses = await removedAddresses();

    // D4 removes 14 addresses: 11 that moved (next.config.ts) and 3 CRM pages that answer 404.
    expect(addresses.length).toBeGreaterThanOrEqual(14);
    expect(addresses).toEqual(
      expect.arrayContaining(["/marketing", "/settings/team", "/leads", "/leads/pipeline"]),
    );
    expect(addresses).not.toContain("/marketing/campaigns");
  });

  it("leaves out only tests, the tombstones, and declarations, and still reads the product", async () => {
    const files = await scannedFiles();

    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((path) => /\.(?:test|spec)\./u.test(path))).toEqual([]);
    expect(files.filter((path) => path.startsWith("app/(gone)/"))).toEqual([]);
    expect(files).toEqual(
      expect.arrayContaining([
        "features/shell/model/navigation.ts",
        "features/campaigns/components/campaigns-tabs.tsx",
        "copy/home-messages.ts",
      ]),
    );
    // The tombstones exist, so the exclusion is not for a directory that is gone.
    expect(await filesUnder(GONE_ROOT)).toContain("leads/page.tsx");
  });
});

describe("the scan finds a link to a removed address (it goes red when one is planted)", () => {
  const addresses = ["/leads", "/leads/pipeline", "/marketing", "/marketing/ads", "/reports"];
  const links = (source: string, file = "planted.tsx") =>
    findRemovedLinks(source, file, addresses).map((hit) => hit.address);

  it.each([
    ['a string: const to = "/leads";', 'const to = "/leads";', "/leads"],
    ["a JSX href", '<a href="/marketing/ads">Ads</a>', "/marketing/ads"],
    ["a JSX href in braces", '<Link href={"/reports"}>Reports</Link>', "/reports"],
    ["a call", 'redirect("/leads/pipeline");', "/leads/pipeline"],
    ["a single quote", "const to = '/leads';", "/leads"],
    ["a template without a hole", "const to = `/leads`;", "/leads"],
    ["a template that starts the path", "const to = `/reports/${id}`;", "/reports"],
    ["a template that ends the path", "const to = `${base}/leads`;", "/leads"],
    ["a trailing slash", 'const to = "/leads/";', "/leads"],
    ["a query", 'const to = "/leads?status=new";', "/leads"],
    ["a fragment on the hub", 'const to = "/marketing#top";', "/marketing"],
    ["a path below a removed address", 'const to = "/reports/abc/pdf";', "/reports"],
    ["an object property", 'const nav = { href: "/marketing/ads/new" };', "/marketing/ads"],
  ])("finds %s", (_name, source, address) => {
    expect(links(source)).toEqual([address]);
  });

  it.each([
    ["a kept address that starts like the hub", 'const to = "/marketing/campaigns";'],
    ["a kept address below the hub", 'const to = "/marketing/campaigns/library";'],
    ["a template under the hub", "const to = `/marketing/${tab}`;"],
    ["a word that starts like a removed address", 'const to = "/leads-report";'],
    ["a comment that records a removal", "// /leads moved to /marketing/campaigns\nconst a = 1;"],
    ["a block comment", "/* the /reports page is gone */\nconst a = 1;"],
    ["text on the screen", "<p>/leads</p>"],
    ["an import", 'import { x } from "./leads/page.js";'],
    ["a different address", 'const to = "/overview";'],
    ["no slash", 'const to = "leads";'],
  ])("does not flag %s", (_name, source) => {
    expect(links(source)).toEqual([]);
  });

  it("reports the line of the link", () => {
    const hits = findRemovedLinks('const a = 1;\n\nconst to = "/leads";', "planted.ts", addresses);

    expect(hits).toEqual([{ address: "/leads", text: "/leads", line: 3 }]);
  });
});

describe("apps/web/src holds no link to a removed address (009F-AC-005)", () => {
  // QA-10. This reads and parses every product file under `apps/web/src`, a whole-tree scan: about a
  // third of a second on a warm machine, and several seconds when a cold file cache or other suites
  // share the disk and the processor. The 5 second default is a limit for a unit, not for a walk of
  // the tree, and a loaded run timed out on it twice. 20 seconds fits the scan; the files it reads
  // and the links it looks for are unchanged.
  it("has none in any file a test does not name them in", async () => {
    const addresses = await removedAddresses();
    const found: string[] = [];

    for (const path of await scannedFiles()) {
      const source = await readFile(join(SOURCE_ROOT, path), "utf8");
      for (const hit of findRemovedLinks(source, path, addresses)) {
        found.push(
          `apps/web/src/${path}:${String(hit.line)} links to ${hit.address} ("${hit.text}")`,
        );
      }
    }

    expect(found).toEqual([]);
  }, 20_000);
});
