import { describe, expect, it } from "vitest";
import { loadSyntheticUiFixture } from "../ui-foundation/data/load-synthetic-ui.js";
import {
  isNavigationItemInteractive,
  projectNavigationForSession,
} from "../shell/model/navigation.js";
import { reportWorkspaceNavigation } from "./navigation.js";

describe("report workspace navigation", () => {
  it("opens implemented preparation pages without altering the fixture or dropping capability requirements", () => {
    const fixture = loadSyntheticUiFixture();
    const source = JSON.stringify(fixture.navigation);
    const navigation = reportWorkspaceNavigation(fixture.navigation);
    for (const path of [
      "/marketing/messaging",
      "/marketing/blueprints",
      "/automations",
      "/marketplace",
      "/brand",
    ]) {
      const item = [...navigation.items, ...navigation.marketingItems].find(
        (entry) => entry.href === path,
      );
      expect(item?.state, path).toBe("available");
      expect(item?.stateDetail).toBeUndefined();
      const original = [...fixture.navigation.items, ...fixture.navigation.marketingItems].find(
        (entry) => entry.href === path,
      );
      expect(item?.requiredCapability).toBe(original?.requiredCapability);
    }
    expect(JSON.stringify(fixture.navigation)).toBe(source);
    const denied = projectNavigationForSession(navigation, {
      ...fixture.session,
      user: { ...fixture.session.user, capabilities: [] },
    });
    for (const item of [...denied.items, ...denied.marketingItems])
      if (item.requiredCapability) expect(isNavigationItemInteractive(item)).toBe(false);
  });
});
