import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009e 009E-AC-008, narrowly superseded by PRD-010 REC-005/007 on October 5.
 * Library-ad views still have no property fields. The explicit property preparation projection
 * restores property and partner context. Every view still excludes CRM pages and invented outcomes.
 *
 * The scan reads code with its comments removed, so a comment saying why a figure is absent does not
 * count as the figure. Strings are read too, because a heading is code that says a word.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");

const COMPONENTS = "apps/web/src/features/campaigns/components";
const PAGES = "apps/web/src/app/(authenticated)/marketing/campaigns";

/** Everything the two pages are built from, from the route down to the data builders. */
const PAGE_SOURCES = [
  `${PAGES}/page.tsx`,
  `${PAGES}/[campaignRef]/page.tsx`,
  `${PAGES}/[campaignRef]/campaign-route.tsx`,
  `${PAGES}/[campaignRef]/versions/[versionNo]/page.tsx`,
  `${COMPONENTS}/persisted-campaign-screen.tsx`,
  `${COMPONENTS}/campaign-list.tsx`,
  `${COMPONENTS}/campaign-ad-card.tsx`,
  `${COMPONENTS}/campaign-approval-section.tsx`,
  `${COMPONENTS}/campaign-header-actions.tsx`,
  `${COMPONENTS}/campaign-library-notices.tsx`,
  `${COMPONENTS}/keep-words-whole.tsx`,
  `${COMPONENTS}/launch-an-ad-link.tsx`,
  `${COMPONENTS}/campaign-results-card.tsx`,
  `${COMPONENTS}/campaign-versions-card.tsx`,
  `${COMPONENTS}/campaigns-tabs.tsx`,
  "apps/web/src/features/campaigns/campaign-page-model.ts",
  "apps/web/src/server/campaign-page-data.ts",
  "apps/web/src/copy/campaign-page-messages.ts",
  "apps/web/src/features/property-campaigns/property-campaign-screen.tsx",
] as const;

/** Only the new preparation view and its shared projection/routing need property context. */
const PROPERTY_CONTEXT_SOURCES: ReadonlySet<string> = new Set([
  `${PAGES}/[campaignRef]/campaign-route.tsx`,
  "apps/web/src/features/campaigns/campaign-page-model.ts",
  "apps/web/src/server/campaign-page-data.ts",
  "apps/web/src/features/property-campaigns/property-campaign-screen.tsx",
]);

const PROPERTY_CONTEXT_RULES: ReadonlySet<string> = new Set([
  "a property address",
  "an open house time",
  "a Realtor partner",
]);

/** A property, an open house, a Realtor, a CRM list, or an outcome that belongs to HighLevel. */
const FORBIDDEN: readonly Readonly<{ name: string; pattern: RegExp }>[] = [
  { name: "a link to /leads", pattern: /["'`]\/leads(?:["'`/?#])/u },
  { name: "a link to the pipeline", pattern: /["'`]\/(?:pipeline|leads\/pipeline)\b/u },
  { name: "a property address", pattern: /\b(?:propertyAddress|property\.address|address)\b/u },
  {
    name: "an open house time",
    pattern: /\bopenHouse(?:StartsAt|EndsAt)\b|open house (?:time|date)/iu,
  },
  { name: "a Realtor partner", pattern: /\b(?:realtorDisplayName|partner)\b/iu },
  { name: "a contact list", pattern: /\bcontacts?\b/iu },
  { name: "a lead table", pattern: /\bleadTable\b|\blead table\b/iu },
  { name: "a pipeline", pattern: /\bpipeline\b/iu },
  { name: "an appointment", pattern: /\bappointments?\b/iu },
  { name: "an application figure", pattern: /\bapplications\b|\bapplicationCount\b/iu },
  { name: "a funded or closed outcome", pattern: /\bfundedOrClosed\b|\bfunded\b/iu },
];

/** The one sentence a campaign made before PRD-009 says, which names the earlier flow and no time. */
const ALLOWED_LINES = ["Made with the earlier open house tool."];

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:"'`])\/\/.*$/gmu, "$1")
    .replace(/\{\s*\}/gu, "{}");
}

async function code(path: string): Promise<string> {
  const source = withoutComments(await readFile(resolve(repositoryRoot, path), "utf8"));
  return ALLOWED_LINES.reduce((text, line) => text.replaceAll(line, ""), source);
}

describe("campaign views exclude CRM data and keep property context isolated (009E-AC-008, REC-005/007)", () => {
  it.each(PAGE_SOURCES)("%s has none of it", async (path) => {
    const source = await code(path);
    for (const { name, pattern } of FORBIDDEN) {
      if (PROPERTY_CONTEXT_SOURCES.has(path) && PROPERTY_CONTEXT_RULES.has(name)) continue;
      expect(pattern.exec(source)?.[0], `${path} has ${name}`).toBeUndefined();
    }
  });

  it("does not exempt a library ad component or a CRM rule from the property amendment", () => {
    expect(PROPERTY_CONTEXT_SOURCES.has(`${COMPONENTS}/campaign-ad-card.tsx`)).toBe(false);
    expect(PROPERTY_CONTEXT_SOURCES.has(`${COMPONENTS}/campaign-results-card.tsx`)).toBe(false);
    expect(PROPERTY_CONTEXT_RULES.has("a contact list")).toBe(false);
    expect(PROPERTY_CONTEXT_RULES.has("a pipeline")).toBe(false);
    expect(PROPERTY_CONTEXT_RULES.has("a funded or closed outcome")).toBe(false);
  });

  it("detects each forbidden shape when it appears", () => {
    for (const [sample, name] of [
      ['<a href="/leads">Leads</a>', "a link to /leads"],
      ["const place = campaign.propertyAddress;", "a property address"],
      ["row.openHouseStartsAt", "an open house time"],
      ["const who = campaign.realtorDisplayName;", "a Realtor partner"],
      ["<h2>Your contacts</h2>", "a contact list"],
      ['<th scope="col">Appointments</th>', "an appointment"],
      ["metrics.applications", "an application figure"],
      ["metrics.fundedOrClosed", "a funded or closed outcome"],
    ] as const) {
      const rule = FORBIDDEN.find((candidate) => candidate.name === name);
      expect(rule?.pattern.test(sample), sample).toBe(true);
    }
  });

  it("is told about every source the two pages are built from", async () => {
    for (const path of PAGE_SOURCES) {
      expect((await code(path)).length, path).toBeGreaterThan(50);
    }
  });
});
