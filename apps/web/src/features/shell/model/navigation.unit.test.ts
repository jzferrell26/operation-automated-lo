import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { syntheticSessionSchema } from "../../ui-foundation/model/synthetic-ui.js";
import {
  isNavigationItemInteractive,
  isNavigationItemSelected,
  projectNavigationForSession,
} from "./navigation.js";

describe("validated navigation projection", () => {
  it("keeps restricted, unavailable, planned, and degraded states distinct", () => {
    const fixture = loadSyntheticUiFixture();
    const navigation = projectNavigationForSession(fixture.navigation, fixture.session);
    const states = Object.fromEntries(navigation.items.map((item) => [item.id, item.state]));

    expect(states).toEqual(
      expect.objectContaining({
        brand: "degraded",
        automations: "unavailable",
        reports: "permission_restricted",
        marketplace: "planned",
      }),
    );
    // PRD-006b D5. The role is lowered into sentence position and given its article, so the
    // detail reads as a sentence rather than as a token pasted into the middle of one.
    expect(navigation.items.find((item) => item.id === "reports")?.stateDetail).toBe(
      "Only an owner or agency user can do this. Ask your workspace owner.",
    );
  });

  it("derives access only from the parsed session capabilities", () => {
    const fixture = loadSyntheticUiFixture();
    const ownerSession = syntheticSessionSchema.parse({
      ...fixture.session,
      user: {
        ...fixture.session.user,
        role: "owner",
        roleLabel: "Owner",
        capabilities: [...fixture.session.user.capabilities, "reports:read"],
      },
    });
    const navigation = projectNavigationForSession(fixture.navigation, ownerSession);
    const reports = navigation.items.find((item) => item.id === "reports");

    expect(reports?.state).toBe("available");
    expect(reports && isNavigationItemInteractive(reports)).toBe(true);
  });

  it("uses the pathname only for selection, never for authority", () => {
    const fixture = loadSyntheticUiFixture();
    const reports = fixture.navigation.items.find((item) => item.id === "reports");

    expect(reports && isNavigationItemSelected(reports, "/reports/quarterly")).toBe(true);
    expect(projectNavigationForSession).toHaveLength(2);
  });
});
