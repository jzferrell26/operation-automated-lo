import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009c part 2, the source scans of 009C-AC-010 and 009C-AC-013.
 *
 * - The library pages are server components, and the page is read on every request, so the sample
 *   guard is asked at request time and never baked into a build.
 * - No client file can reach the loader or a catalog file, directly or through anything it imports,
 *   so an entry's `compliance` and `approval` never reach a public bundle.
 * - The tab has no search box and no sort control.
 *
 * The reachability scan is a function of a file map, so a case with a planted fault can prove it
 * would catch one.
 */

const webSource = resolve(import.meta.dirname, "../../../../..");
const libraryDirectory = import.meta.dirname;

type Sources = ReadonlyMap<string, string>;

async function sourcesUnder(directory: string, into: Map<string, string>): Promise<void> {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) {
      if (item.name !== "node_modules") await sourcesUnder(path, into);
    } else if (/\.(?:ts|tsx|json)$/u.test(item.name)) {
      into.set(path.replaceAll("\\", "/"), await readFile(path, "utf8"));
    }
  }
}

const USE_CLIENT = /^\s*(?:\/\*[\s\S]*?\*\/\s*)?["']use client["']/u;
const RELATIVE_IMPORT =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\sfrom\s+)?["'](\.{1,2}\/[^"']+)["']/gu;

function resolveImport(from: string, specifier: string, sources: Sources): string | undefined {
  const base = resolve(dirname(from), specifier).replaceAll("\\", "/");
  const stem = base.replace(/\.js$/u, "");
  return [base, `${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`, `${stem}/index.tsx`].find(
    (candidate) => sources.has(candidate),
  );
}

/** Where a client file's imports lead, transitively, to a module a browser must never receive. */
export function clientReachesTheLoader(sources: Sources): string[] {
  const forbidden = (path: string): boolean =>
    /\/features\/ads-library\/server\//u.test(path) ||
    /\/fixtures\/ads-library\//u.test(path) ||
    /\/features\/ads-library\/catalog\//u.test(path);
  const found: string[] = [];
  for (const [path, text] of sources) {
    if (!/\.tsx?$/u.test(path) || !USE_CLIENT.test(text)) continue;
    const seen = new Set<string>([path]);
    const queue: Array<readonly [string, string]> = [[path, path]];
    while (queue.length > 0) {
      const [current, via] = queue.shift() ?? [path, path];
      const source = sources.get(current) ?? "";
      for (const match of source.matchAll(RELATIVE_IMPORT)) {
        const target = resolveImport(current, match[1] ?? "", sources);
        if (target === undefined || seen.has(target)) continue;
        seen.add(target);
        if (forbidden(target)) found.push(`${path} reaches ${target} through ${via}`);
        else queue.push([target, current]);
      }
    }
  }
  return found;
}

describe("what a browser can receive (009C-AC-013)", () => {
  it("has no client file that reaches the loader or a catalog, however far down its imports go", async () => {
    const sources = new Map<string, string>();
    await sourcesUnder(webSource, sources);

    const clientFiles = [...sources].filter(
      ([path, text]) => /\.tsx?$/u.test(path) && USE_CLIENT.test(text),
    );
    // The scan must be reading something: the product has many client files, the library's among them.
    expect(clientFiles.length).toBeGreaterThan(10);
    expect(
      clientFiles.some(([path]) => path.endsWith("/library/ads-library-browser.tsx")),
    ).toBe(true);
    expect(clientReachesTheLoader(sources)).toEqual([]);
  });

  it("would catch a client file that imported the loader, or imported something that does", () => {
    // Keys are built the way the scan builds them, so the case reads the same on every platform.
    const at = (path: string): string => resolve(path).replaceAll("\\", "/");
    const loaderImport = 'import { loadAdsLibrary } from "../features/ads-library/server/catalog-loader.js";\n';
    const sources: Sources = new Map([
      [at("/web/features/ads-library/server/catalog-loader.ts"), "export const loadAdsLibrary = 1;"],
      [at("/web/features/ads-library/catalog/catalog.json"), "[]"],
      [at("/web/a/direct.tsx"), `"use client";\n${loaderImport}`],
      [at("/web/a/indirect.tsx"), '"use client";\nimport { helper } from "./helper.js";\n'],
      [
        at("/web/a/helper.ts"),
        'import "../features/ads-library/catalog/catalog.json";\nexport const helper = 1;\n',
      ],
      [at("/web/a/server-side.ts"), loaderImport],
      [at("/web/a/clean.tsx"), '"use client";\nexport const clean = 1;\n'],
    ]);

    const found = clientReachesTheLoader(sources);
    expect(found).toHaveLength(2);
    expect(found.join("\n")).toContain("/web/a/direct.tsx reaches");
    expect(found.join("\n")).toContain("/web/a/indirect.tsx reaches");
    expect(found.join("\n")).not.toContain("clean.tsx");
    expect(found.join("\n")).not.toContain("server-side");
  });

  it("makes the library's own pages server components that hand a client component display fields", async () => {
    const page = await readFile(join(libraryDirectory, "page.tsx"), "utf8");
    const screen = await readFile(join(libraryDirectory, "ads-library-screen.tsx"), "utf8");
    const browser = await readFile(join(libraryDirectory, "ads-library-browser.tsx"), "utf8");

    expect(page).not.toMatch(USE_CLIENT);
    expect(screen).not.toMatch(USE_CLIENT);
    expect(browser).toMatch(USE_CLIENT);
    // Only the loader's data module, which maps entries to display cards, may touch the catalog.
    for (const [name, text] of [
      ["page.tsx", page],
      ["ads-library-screen.tsx", screen],
      ["ads-library-browser.tsx", browser],
    ] as const) {
      expect(text, name).not.toMatch(/catalog-loader|catalog\.json|sample-catalog|\.compliance|\.approval\b/u);
    }
  });
});

describe("reading the guard at request time (009C-AC-004)", () => {
  it("renders the library on every request, so the sample guard is never baked into a build", async () => {
    const page = await readFile(join(libraryDirectory, "page.tsx"), "utf8");
    expect(page).toMatch(/export const dynamic = "force-dynamic";/u);
    expect(page).not.toMatch(/generateStaticParams|export const revalidate|force-static/u);
  });
});

/** A comment may say what the tab does not have; only what a file renders or styles counts. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:])\/\/[^\n]*/gu, "$1");
}

describe("the library tab (009C-AC-010)", () => {
  it("has no search box and no sort control in any of its files", async () => {
    const files = (await readdir(libraryDirectory))
      .filter((name) => /\.(?:tsx?|css)$/u.test(name) && !/\.test\.tsx?$/u.test(name))
      .sort();
    expect(files).toContain("page.tsx");
    for (const name of files) {
      const text = withoutComments(await readFile(join(libraryDirectory, name), "utf8"));
      expect(text, relative(webSource, join(libraryDirectory, name))).not.toMatch(
        /type=["']search["']|role=["'](?:searchbox|search|combobox|listbox)["']|<select\b|<input\b|\bsort(?:ed|ing)?\b/iu,
      );
    }
  });
});

/**
 * The rules in `css` that make a grid and do not name its column track. An implicit `auto` track is
 * sized from its content, and here the content is cards that are size containers: stacked three deep
 * it held the main thread for about 2.5 seconds per load (see the stylesheet's own note).
 */
function gridsWithoutATrack(css: string): string[] {
  const found: string[] = [];
  for (const rule of withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const body = rule[2] ?? "";
    if (/display:\s*grid\b/u.test(body) && !/grid-template-columns:/u.test(body)) {
      found.push((rule[1] ?? "").trim());
    }
  }
  return found;
}

describe("the library's layout cost (009C-AC-010)", () => {
  it("gives every grid in its stylesheet a column track, so no level is sized from the cards", async () => {
    const css = await readFile(join(libraryDirectory, "ads-library.module.css"), "utf8");
    expect(css).toMatch(/display:\s*grid/u);
    expect(gridsWithoutATrack(css)).toEqual([]);
    expect(css.match(/grid-template-columns:\s*minmax\(0,\s*1fr\)/gu)?.length).toBeGreaterThanOrEqual(4);
  });

  it("would catch a grid that leaves its track to its content", () => {
    expect(gridsWithoutATrack(".a { display: grid; gap: 1px; }")).toEqual([".a"]);
    expect(gridsWithoutATrack("/* .b { display: grid; } */ .c { display: block; }")).toEqual([]);
    expect(
      gridsWithoutATrack(".d { display: grid; grid-template-columns: minmax(0, 1fr); }"),
    ).toEqual([]);
  });
});
