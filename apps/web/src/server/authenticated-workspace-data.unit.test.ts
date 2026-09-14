import { describe, expect, it } from "vitest";

import {
  AuthenticatedWorkspaceUnavailableError,
  authenticatedWorkspaceMode,
  loadAuthenticatedWorkspace,
} from "./authenticated-workspace-data.js";

describe("authenticated workspace data boundary", () => {
  it("allows the explicitly synthetic local workspace", () => {
    expect(
      authenticatedWorkspaceMode({
        OALO_ENVIRONMENT: "local",
        OALO_PROVIDER_MODE: "stub",
        OALO_SYNTHETIC_DATA_ONLY: "true",
      }),
    ).toBe("synthetic");

    const workspace = loadAuthenticatedWorkspace({
      OALO_ENVIRONMENT: "local",
      OALO_PROVIDER_MODE: "stub",
      OALO_SYNTHETIC_DATA_ONLY: "true",
    });
    expect(workspace.ui.session.safety.dataMode).toBe("synthetic");
    expect(workspace.brand.safety.dataMode).toBe("synthetic");
    expect(workspace.reporting.safety.dataMode).toBe("synthetic");
  });

  it("fails closed instead of projecting synthetic customer state in staging", () => {
    expect(() =>
      loadAuthenticatedWorkspace({
        OALO_ENVIRONMENT: "staging",
        OALO_PROVIDER_MODE: "contract-test",
        OALO_SYNTHETIC_DATA_ONLY: "false",
      }),
    ).toThrow(AuthenticatedWorkspaceUnavailableError);
  });

  it("fails closed instead of projecting synthetic customer state in production", () => {
    expect(() =>
      loadAuthenticatedWorkspace({
        OALO_ENVIRONMENT: "production",
        OALO_PROVIDER_MODE: "live",
        OALO_SYNTHETIC_DATA_ONLY: "false",
      }),
    ).toThrow(/refusing to render synthetic customer state/u);
  });
});
