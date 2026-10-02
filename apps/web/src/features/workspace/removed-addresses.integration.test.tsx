import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config.js";
import GoneNotFound from "../../app/(gone)/not-found.js";
import GoneAutomationsPage from "../../app/(gone)/automations/page.js";
import GoneLeadsPage from "../../app/(gone)/leads/page.js";
import GonePipelinePage from "../../app/(gone)/leads/pipeline/page.js";

/**
 * PRD-009f D1, 009F-AC-001 and 009F-AC-002, and the fixed-target rule of the PRD's security notes.
 *
 * What is written out below is D1's table, restated here as the oracle rather than imported from
 * the code that implements it, so a row that is dropped or retargeted in `next.config.ts` fails
 * here instead of being agreed with.
 *
 * A redirect is answered by the framework before any page renders, which is what makes it a real
 * 3xx status in review, synthetic and dashboard preview modes alike. The same server cannot do that
 * from inside a page: a page under the signed-in layout has begun streaming by the time it calls
 * `redirect()`, so its status is already 200 (`docs/01-app/03-api-reference/03-file-conventions/
 * loading.md`, "Status Codes"). The rules are read the way the framework reads them, from the
 * config's own `redirects()`.
 */

const D1_REDIRECTS = [
  ["/marketing", "/marketing/campaigns"],
  ["/marketing/property-sites", "/marketing/campaigns"],
  ["/marketing/creative", "/marketing/campaigns"],
  ["/marketing/ads", "/marketing/campaigns"],
  ["/marketing/messaging", "/marketing/campaigns"],
  ["/marketing/blueprints", "/marketing/campaigns/library"],
  ["/reports", "/marketing/campaigns"],
  ["/marketplace", "/overview"],
  ["/settings/profile", "/brand"],
  ["/settings/team", "/settings/account"],
  ["/onboarding", "/overview"],
] as const;

/** The three CRM addresses that answer 404 with the gone page. */
const D1_GONE = ["/leads", "/leads/pipeline", "/automations"] as const;

/** D1's kept addresses that have a fixed path, and so can be named without a record's reference. */
const D1_KEPT = [
  "/overview",
  "/marketing/campaigns",
  "/marketing/campaigns/new",
  "/marketing/campaigns/synthetic-open-house-001",
  "/brand",
  "/partners",
  "/homeowners",
  "/homeowners/new",
  "/settings",
  "/settings/account",
  "/settings/connections",
  "/settings/routing",
  "/settings/billing",
  "/design-surfaces",
] as const;

const APP_DIRECTORY = join(import.meta.dirname, "../../app");

/** What the framework would answer for a GET of `path`, from the rules it was configured with. */
async function answerFor(path: string): Promise<{ status: number; location: string } | null> {
  const rules = (await nextConfig.redirects?.()) ?? [];
  const rule = rules.find((candidate) => candidate.source === path);
  if (rule === undefined) return null;
  return {
    status: "statusCode" in rule ? rule.statusCode : rule.permanent ? 308 : 307,
    location: rule.destination,
  };
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .sort();
}

describe("009F-AC-002: every old address that has moved answers a redirect", () => {
  it.each(D1_REDIRECTS)("%s answers a 3xx whose Location is %s", async (from, to) => {
    const answer = await answerFor(from);

    expect(answer).not.toBeNull();
    expect(answer!.status).toBeGreaterThanOrEqual(300);
    expect(answer!.status).toBeLessThan(400);
    expect(answer!.location).toBe(to);
  });

  it("redirects exactly D1's addresses and nothing else", async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];

    expect(rules.map((rule) => rule.source).sort()).toEqual(
      D1_REDIRECTS.map(([from]) => from as string).sort(),
    );
  });

  it("uses a temporary redirect, so a browser never keeps a stale answer for a page that may return", async () => {
    for (const [from] of D1_REDIRECTS) expect((await answerFor(from))!.status, from).toBe(307);
  });

  it("only ever sends a visitor to a fixed address inside the application", async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];
    const addresses: readonly string[] = [...D1_KEPT, "/marketing/campaigns/library"];

    for (const rule of rules) {
      // One leading slash and plain path characters: no host, no scheme, no `//` that a browser
      // would read as another origin, and no `:name` or `*` that would copy part of the request.
      expect(rule.destination, rule.source).toMatch(/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/u);
      expect(addresses, rule.source).toContain(rule.destination);
      expect(rule.source, "a source that reads the request").not.toMatch(/[:*()]/u);
      expect(rule, "a rule that reads the request").not.toHaveProperty("has");
      expect(rule, "a rule that reads the request").not.toHaveProperty("missing");
    }
  });

  it("never redirects an address that D1 keeps or one that answers the gone page", async () => {
    for (const address of [...D1_KEPT, ...D1_GONE])
      expect(await answerFor(address), address).toBeNull();
  });
});

describe("009F-AC-001: the three CRM addresses answer the gone page", () => {
  it.each([
    ["/leads", GoneLeadsPage],
    ["/leads/pipeline", GonePipelinePage],
    ["/automations", GoneAutomationsPage],
  ] as const)("%s answers not-found, which is the 404 status", (_address, page) => {
    expect(() => page()).toThrowError(
      expect.objectContaining({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" }),
    );
  });

  it("says where the work went and offers the way home", () => {
    render(<GoneNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "This page is gone." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your leads, pipelines and follow-up live in HighLevel."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/overview");
  });

  it("serves the gone page for those three addresses only", () => {
    expect(filesUnder(join(APP_DIRECTORY, "(gone)"))).toEqual([
      "automations/page.tsx",
      "layout.tsx",
      "leads/page.tsx",
      "leads/pipeline/page.tsx",
      "not-found.tsx",
    ]);
    // Any other unknown address is still the catch-all's ordinary not-found, which has no page of
    // its own to say a CRM page used to be here.
    const elsewhere = filesUnder(join(APP_DIRECTORY, "(authenticated)")).filter((file) =>
      file.endsWith("not-found.tsx"),
    );
    expect(elsewhere).toEqual([]);
  });
});
