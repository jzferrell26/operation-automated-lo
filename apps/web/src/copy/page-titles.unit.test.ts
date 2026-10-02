import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import {
  DEFAULT_PAGE_TITLE,
  PAGE_TITLES,
  PAGE_TITLE_TEMPLATE,
  SITE_DESCRIPTION,
} from "./page-titles.js";
import { SHELL_WORDMARK } from "./shell-messages.js";

/**
 * PRD-009 writing review pass 1, W-13. Every page used to read "Operation Automated LO" in its tab,
 * which is not the product's name and told a person nothing about which tab was which.
 */

const appRoot = resolve(import.meta.dirname, "../app");

describe("the words in a browser tab", () => {
  it("name the product by its wordmark, never as Operation Automated LO", () => {
    expect(DEFAULT_PAGE_TITLE).toBe("Automated LO");
    expect(DEFAULT_PAGE_TITLE).toBe(SHELL_WORDMARK);
    expect(PAGE_TITLE_TEMPLATE).toBe("%s | Automated LO");
    expect(SITE_DESCRIPTION).not.toContain("Operation");
  });

  it("say what each signed-in page is", () => {
    expect(PAGE_TITLES).toEqual({
      home: "Home",
      campaigns: "Campaigns",
      adsLibrary: "Ads library",
      launchAnAd: "Launch an ad",
      campaign: "Campaign",
      brand: "Brand",
      connections: "Connections",
      settings: "Settings",
      partners: "Realtor partners",
      routing: "Where new leads go",
      billing: "Plan and usage",
      gone: "Page gone",
    });
  });

  it("describe the product in plain words, with the approval saved by name", () => {
    expect(SITE_DESCRIPTION).toBe(
      "Automated LO: launch ready-made Facebook ads for loan officers, with every approval saved by name.",
    );
  });

  it("carry no forbidden word, no dash, and no template mark but the one", () => {
    const strings = [
      DEFAULT_PAGE_TITLE,
      SITE_DESCRIPTION,
      PAGE_TITLE_TEMPLATE.replace("%s", "Page"),
      ...Object.values(PAGE_TITLES),
    ];
    for (const phrase of strings) {
      expect(findVocabularyHits(phrase), phrase).toEqual([]);
      // No en dash (code point 8211) and no em dash (code point 8212), in any string.
      expect(phrase, phrase).not.toContain(String.fromCodePoint(0x2013));
      expect(phrase, phrase).not.toContain(String.fromCodePoint(0x2014));
    }
    expect(PAGE_TITLE_TEMPLATE.match(/%s/gu)).toHaveLength(1);
  });
});

async function pageSources(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && /^(?:page|not-found)\.tsx$/u.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * The template adds "| Automated LO" to a page's own title, so a title that already says the
 * product's name would read "Sign in to Automated LO | Automated LO". Such a page writes its title
 * as `{ absolute: "..." }`, which the template leaves alone.
 */
describe("a page title that already names the product", () => {
  it("is written absolute, so the template does not say the name twice", async () => {
    const offenders: string[] = [];
    for (const path of await pageSources(appRoot)) {
      const source = await readFile(path, "utf8");
      for (const match of source.matchAll(/\btitle:\s*"(?<title>[^"]*)"/gu)) {
        if (/Automated LO/u.test(match.groups?.["title"] ?? "")) {
          offenders.push(`${path}: ${match[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("is still found when it is written absolute, so the check above is not blind", async () => {
    const signIn = await readFile(join(appRoot, "(public)/sign-in/page.tsx"), "utf8");

    expect(signIn).toMatch(/title:\s*\{\s*absolute:\s*"Sign in to Automated LO"\s*\}/u);
  });
});
