import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009d source scans over the ad components and the "Launch an ad" flow.
 *
 * - 009D-AC-006: the words and the Brand text reach the page only as React text children or
 *   attribute strings. No HTML injection, no markdown rendering, and no link or image address built
 *   from them.
 * - 009D-AC-008: the flow has no radius, ZIP, age, gender, interest, or audience control. Places
 *   are the only way to say where an ad shows.
 * - 009D-AC-023: no ad component imports partner data. The flow learns saved partners only as the
 *   name list the co-brand check reads, and that happens on the server.
 *
 * Each scan reads code with comments removed, so a comment explaining why a control is absent does
 * not count as the control.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");

const COMPONENTS = "apps/web/src/features/campaigns/components";

/** The preview, the band, the library card, the campaign page, the list, and the flow's screens. */
const AD_COMPONENTS = [
  `${COMPONENTS}/ad-creative.tsx`,
  `${COMPONENTS}/ad-feed-preview.tsx`,
  `${COMPONENTS}/brand-band.tsx`,
  `${COMPONENTS}/ad-library-cards.tsx`,
  `${COMPONENTS}/ad-places-field.tsx`,
  `${COMPONENTS}/launch-flow.tsx`,
  `${COMPONENTS}/launch-review.tsx`,
  `${COMPONENTS}/launch-on-facebook.tsx`,
  `${COMPONENTS}/persisted-campaign-screen.tsx`,
  "apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx",
] as const;

/** Everything the three steps are built from. */
const FLOW_SOURCES = [
  `${COMPONENTS}/launch-flow.tsx`,
  `${COMPONENTS}/ad-places-field.tsx`,
  `${COMPONENTS}/launch-review.tsx`,
  `${COMPONENTS}/launch-on-facebook.tsx`,
  "apps/web/src/features/campaigns/launch-model.ts",
  "apps/web/src/app/(authenticated)/marketing/campaigns/new/page.tsx",
] as const;

const HTML_INJECTION =
  /dangerouslySetInnerHTML|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|\bsrcDoc\b|document\.write|react-markdown|\bmarked\b|\bremark\b|\brehype\b|markdown/iu;

/** Names the words and the Brand text travel under anywhere in the flow. */
const WORDS_OR_BRAND =
  /\b(?:headline|primaryText|body|words|advertiser|brand|band|name|title|company|disclosure\w*|consent\w*|leadForm\w*|nmls\w*)\b/iu;

const TARGETING_CONTROL =
  /\b(?:radius|radii|miles?Around|zip|zips|zipcode|postal\w*|age|ages|ageRange|gender\w*|interests?|audiences?|lookalikes?|demographics?|detailedTargeting)\b/iu;

const PARTNER_IMPORT = /^\s*import\b[^;]*partner/imu;

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:"'`])\/\/.*$/gmu, "$1")
    .replace(/\{\s*\}/gu, "{}");
}

async function code(path: string): Promise<string> {
  return withoutComments(await readFile(resolve(repositoryRoot, path), "utf8"));
}

/** Every `href={...}` and `src={...}` expression, read to its matching brace. */
function addressExpressions(source: string): readonly string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/\b(?:href|src|srcSet|action|formAction)=\{/gu)) {
    let depth = 1;
    let index = (match.index ?? 0) + match[0].length;
    const start = index;
    while (index < source.length && depth > 0) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      index += 1;
    }
    found.push(source.slice(start, index - 1));
  }
  return found;
}

describe("the ad components print the words and the Brand text only as text (009D-AC-006)", () => {
  it.each(AD_COMPONENTS)("%s has no HTML injection or markdown rendering", async (path) => {
    expect(await code(path)).not.toMatch(HTML_INJECTION);
  });

  it.each(AD_COMPONENTS)("%s builds no link or image address from the words", async (path) => {
    const built = addressExpressions(await code(path)).filter((expression) =>
      WORDS_OR_BRAND.test(expression),
    );
    expect(built).toEqual([]);
  });

  it("detects each forbidden shape when it appears", () => {
    for (const sample of [
      "<p dangerouslySetInnerHTML={{ __html: headline }} />",
      "node.innerHTML = body;",
      "<iframe srcDoc={words} />",
      'import Markdown from "react-markdown";',
    ]) {
      expect(HTML_INJECTION.test(sample), sample).toBe(true);
    }
    expect(addressExpressions("<a href={`/x?q=${headline}`}>x</a>")).toEqual([
      "`/x?q=${headline}`",
    ]);
    expect(WORDS_OR_BRAND.test("`/x?q=${headline}`")).toBe(true);
    expect(WORDS_OR_BRAND.test("advertiser.company")).toBe(true);
    expect(WORDS_OR_BRAND.test("launchHref({ step: 1, campaign: review.campaignRef, from })")).toBe(
      false,
    );
  });
});

describe("the flow has no way to aim an ad at people (009D-AC-008)", () => {
  it.each(FLOW_SOURCES)(
    "%s has no radius, ZIP, age, gender, interest, or audience control",
    async (path) => {
      const match = TARGETING_CONTROL.exec(await code(path));
      expect(match?.[0]).toBeUndefined();
    },
  );

  it("detects each forbidden control when it appears", () => {
    for (const sample of [
      '<Input label="Radius" />',
      "const zip = form.zip;",
      '<Select label="Age range" />',
      "gender: 'women'",
      "interests: []",
      "audience: lookalike",
    ]) {
      expect(TARGETING_CONTROL.test(sample), sample).toBe(true);
    }
    expect(TARGETING_CONTROL.test("const page = usePage(); // Page, AZ")).toBe(false);
  });
});

describe("Launch on Facebook is disabled by construction (009D-AC-016)", () => {
  const LAUNCH_BUTTON_ATTRIBUTES = ["aria-describedby", "disabled", "type", "variant"];

  /**
   * The attribute names on the `<Button>` whose label is `LAUNCH_ON_FACEBOOK`. The opening tag is
   * read to the `>` that closes it outside any `{...}`, because an arrow function's `=>` is a `>`.
   */
  function launchButtonAttributes(source: string): readonly string[] {
    const label = source.indexOf("{LAUNCH_ON_FACEBOOK}");
    const start = source.lastIndexOf("<Button", label);
    if (label < 0 || start < 0) {
      throw new Error("The Launch on Facebook button is not where the scan expects it");
    }
    let depth = 0;
    let outside = "";
    for (const character of source.slice(start + "<Button".length)) {
      if (character === "{") depth += 1;
      if (depth === 0 && character === ">") break;
      if (depth === 0) outside += character;
      if (character === "}") depth -= 1;
    }
    return [...outside.matchAll(/([A-Za-z-]+)(?==|\s|$)/gu)].map((match) => match[1] ?? "");
  }

  it("carries only its described-by, disabled, type, and variant attributes", async () => {
    const source = await code(`${COMPONENTS}/launch-on-facebook.tsx`);
    expect([...launchButtonAttributes(source)].sort()).toEqual(LAUNCH_BUTTON_ATTRIBUTES);
  });

  it("has no handler, request, router, or form anywhere in its file", async () => {
    const source = await code(`${COMPONENTS}/launch-on-facebook.tsx`);
    expect(source).not.toMatch(
      /\bon[A-Z]\w*=|formAction|\bform=|\baction=|\bfetch\(|InternalJson|useRouter|useTransition|useActionState|"use server"/u,
    );
  });

  it("detects a handler or a request when one appears", () => {
    const planted =
      '<Button aria-describedby={id} disabled onClick={() => fetch("/api/campaigns/launch")} type="button" variant="outline">\n<Icon decorative name="megaphone" size="sm" /> {LAUNCH_ON_FACEBOOK}';
    expect(launchButtonAttributes(planted)).toContain("onClick");
    expect(planted).toMatch(/\bon[A-Z]\w*=|\bfetch\(/u);
  });
});

describe("no ad component imports partner data (009D-AC-023)", () => {
  it.each([...new Set([...AD_COMPONENTS, ...FLOW_SOURCES])])(
    "%s imports nothing about partners",
    async (path) => {
      expect(await code(path)).not.toMatch(PARTNER_IMPORT);
    },
  );

  it("detects a partner import when one appears", () => {
    expect(PARTNER_IMPORT.test('import { readPartners } from "../../server/partners.js";')).toBe(
      true,
    );
    expect(
      PARTNER_IMPORT.test('import type { WorkspacePartner } from "../workspace/model.js";'),
    ).toBe(true);
  });
});
