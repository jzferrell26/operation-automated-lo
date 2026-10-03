import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { syntheticSessionSchema } from "../../ui-foundation/model/synthetic-ui.js";
import {
  MAIN_MENU,
  NO_ACCESS_DETAIL,
  isNavigationItemInteractive,
  isNavigationItemSelected,
  mainMenuNavigation,
  projectNavigationForSession,
} from "./navigation.js";

/**
 * PRD-009a D2 and 009A-AC-014. The six items, in the owner's words and order ("Yes, as shown"),
 * at today's addresses (D-12). The Ads library is a tab of Campaigns, not a menu item (D-16).
 */
const THE_SIX = [
  ["Home", "/overview"],
  ["Campaigns", "/marketing/campaigns"],
  ["Brand", "/brand"],
  ["Realtor partners", "/partners"],
  ["Homeowner reports", "/homeowners"],
  ["Settings", "/settings"],
] as const;

const RETIRED_LABELS =
  /Leads|Pipeline|Automations|^Reports$|Marketplace|Workspace tools|Marketing Suite|Property Sites|PDFs and Creative|Ads Manager|Email and SMS|Blueprint|Getting started|Overview/u;

describe("the one menu (009A-AC-014)", () => {
  it("defines exactly the six items of D2, in order", () => {
    expect(MAIN_MENU.map((item) => [item.label, item.href])).toEqual(THE_SIX);
    expect(MAIN_MENU.filter((item) => RETIRED_LABELS.test(item.label))).toEqual([]);
  });

  it("projects every item as available before the role projection runs", () => {
    const navigation = mainMenuNavigation();
    expect(navigation.items.map((item) => [item.label, item.href])).toEqual(THE_SIX);
    expect(navigation.items.every((item) => item.state === "available")).toBe(true);
    expect(Object.keys(navigation)).toEqual(["items"]);
  });

  it("is what the synthetic fixture carries, so the fixture is not a second menu", () => {
    const fixture = loadSyntheticUiFixture();
    expect(fixture.navigation.items.map((item) => [item.label, item.href])).toEqual(THE_SIX);
    expect(fixture.navigation).toEqual(mainMenuNavigation());
  });
});

describe("the role projection still decides access (009A-AC-009, 010)", () => {
  it("lists Homeowner reports for every account and gates it on reports:read", () => {
    const homeownerReports = MAIN_MENU.find((item) => item.href === "/homeowners");
    expect(homeownerReports?.requiredCapability).toBe("reports:read");

    const fixture = loadSyntheticUiFixture();
    const withoutReports = syntheticSessionSchema.parse({
      ...fixture.session,
      user: {
        ...fixture.session.user,
        capabilities: fixture.session.user.capabilities.filter(
          (capability) => capability !== "reports:read",
        ),
      },
    });
    const projected = projectNavigationForSession(mainMenuNavigation(), withoutReports);
    const restricted = projected.items.find((item) => item.href === "/homeowners");

    expect(projected.items.map((item) => item.label)).toEqual(THE_SIX.map(([label]) => label));
    expect(restricted?.state).toBe("permission_restricted");
    expect(restricted?.stateDetail).toBe(NO_ACCESS_DETAIL);
    expect(restricted && isNavigationItemInteractive(restricted)).toBe(false);
  });

  it("opens all six for a workspace owner", () => {
    const fixture = loadSyntheticUiFixture();
    const owner = syntheticSessionSchema.parse({
      ...fixture.session,
      user: {
        ...fixture.session.user,
        role: "owner",
        roleLabel: "Owner",
        capabilities: [
          "campaign:create",
          "location:read",
          "onboarding:read",
          "pipeline:read",
          "reports:read",
          "settings:read",
        ],
      },
    });
    const projected = projectNavigationForSession(mainMenuNavigation(), owner);
    expect(projected.items.every(isNavigationItemInteractive)).toBe(true);
  });

  it("uses the pathname only for selection, never for authority", () => {
    const [home, campaigns] = mainMenuNavigation().items;

    expect(home && isNavigationItemSelected(home, "/overview")).toBe(true);
    expect(home && isNavigationItemSelected(home, "/overview/anything")).toBe(false);
    expect(campaigns && isNavigationItemSelected(campaigns, "/marketing/campaigns/new")).toBe(true);
    expect(campaigns && isNavigationItemSelected(campaigns, "/marketing")).toBe(false);
    expect(projectNavigationForSession).toHaveLength(2);
  });
});
