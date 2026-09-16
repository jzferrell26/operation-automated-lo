import { describe, expect, it } from "vitest";

import {
  AuthenticatedWorkspaceUnavailableError,
  OALO_REVIEW_SURFACE_AUTHORIZED,
  OALO_REVIEW_SURFACE_ENV,
  REVIEW_LOCATION_DISPLAY_NAME,
  REVIEW_ROLE_LABEL,
  REVIEW_SPEND_METRIC_ID,
  REVIEW_SPEND_METRIC_LABEL,
  REVIEW_SURFACE_DISCLOSURE,
  REVIEW_USER_DISPLAY_NAME,
  authenticatedWorkspaceMode,
  campaignPersistenceKind,
  canRenderReviewSurface,
  isReviewSurfaceAuthorized,
  loadAuthenticatedWorkspace,
} from "./authenticated-workspace-data.js";

const stubSynthetic = {
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
} as const;

const reviewProduction = {
  OALO_ENVIRONMENT: "production",
  ...stubSynthetic,
  [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
} as const;

describe("authenticated workspace data boundary", () => {
  it("allows the explicitly synthetic local workspace", () => {
    expect(
      authenticatedWorkspaceMode({
        OALO_ENVIRONMENT: "local",
        ...stubSynthetic,
      }),
    ).toBe("synthetic");

    const workspace = loadAuthenticatedWorkspace({
      OALO_ENVIRONMENT: "local",
      ...stubSynthetic,
    });
    expect(workspace.mode).toBe("synthetic");
    expect(workspace.ui.session.safety.dataMode).toBe("synthetic");
    expect(workspace.brand.safety.dataMode).toBe("synthetic");
    expect(workspace.reporting.safety.dataMode).toBe("synthetic");
  });

  it("selects filesystem persistence only for synthetic local and preview", () => {
    expect(
      campaignPersistenceKind({
        OALO_ENVIRONMENT: "local",
        ...stubSynthetic,
      }),
    ).toBe("filesystem");
    expect(
      campaignPersistenceKind({
        OALO_ENVIRONMENT: "preview",
        ...stubSynthetic,
      }),
    ).toBe("filesystem");
    expect(
      campaignPersistenceKind({
        OALO_ENVIRONMENT: "production",
        ...stubSynthetic,
        [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
      }),
    ).toBe("postgres");
  });

  it("allows the explicit review surface in production without enabling providers", () => {
    const input = reviewProduction;

    expect(isReviewSurfaceAuthorized(input)).toBe(true);
    expect(authenticatedWorkspaceMode(input)).toBe("review");
    expect(canRenderReviewSurface(input)).toBe(true);

    const workspace = loadAuthenticatedWorkspace(input);
    expect(workspace.mode).toBe("review");
    expect(workspace.ui.session.safety.dataMode).toBe("synthetic");
    expect(workspace.ui.session.safety.disclosure).toBe(REVIEW_SURFACE_DISCLOSURE);
    expect(workspace.ui.overview.heading).toMatch(/demo, not connected/i);
    expect(workspace.ui.overview.health.every((item) => item.state === "setup_required")).toBe(
      true,
    );
    expect(workspace.ui.overview.metrics.every((metric) => metric.state === "not_connected")).toBe(
      true,
    );
    expect(workspace.ui.overview.metrics.some((metric) => "value" in metric)).toBe(false);
    expect(workspace.brand.safety.disclosure).toBe(REVIEW_SURFACE_DISCLOSURE);
    expect(workspace.reporting.safety.disclosure).toBe(REVIEW_SURFACE_DISCLOSURE);
    expect(REVIEW_SURFACE_DISCLOSURE).toMatch(/REVIEW SURFACE/u);
    expect(REVIEW_SURFACE_DISCLOSURE).toMatch(/Demo fixtures only/u);
    expect(REVIEW_SURFACE_DISCLOSURE).toMatch(/Not connected/u);
  });

  it("projects spend and leads as reachable not-connected metrics on the review surface", () => {
    const { metrics } = loadAuthenticatedWorkspace(reviewProduction).ui.overview;
    const byLabel = new Map(metrics.map((metric) => [metric.label, metric]));

    for (const label of [REVIEW_SPEND_METRIC_LABEL, "New leads"]) {
      const metric = byLabel.get(label);
      expect(metric?.state).toBe("not_connected");
      expect(metric?.source).toMatch(/Not connected/u);
      expect(metric && "value" in metric).toBe(false);
    }
    expect(byLabel.get(REVIEW_SPEND_METRIC_LABEL)?.id).toBe(REVIEW_SPEND_METRIC_ID);
  });

  it("collapses every tenant-state region to honest empty or not-connected in review mode", () => {
    const { overview, session } = loadAuthenticatedWorkspace(reviewProduction).ui;

    expect(overview.attention).toEqual([]);
    expect(overview.recentActivity).toEqual([]);
    expect(overview.activeWork).toEqual([]);
    expect(overview.workspaceStatus.every((item) => item.state === "setup_required")).toBe(true);
    expect(overview.workspaceStatus.every((item) => item.freshness === "No live observation")).toBe(
      true,
    );
    expect(session.location.displayName).toBe(REVIEW_LOCATION_DISPLAY_NAME);
    expect(session.user.displayName).toBe(REVIEW_USER_DISPLAY_NAME);
    expect(session.user.roleLabel).toBe(REVIEW_ROLE_LABEL);
  });

  it("leaves the demo-rich synthetic local workspace untouched", () => {
    const { overview, session } = loadAuthenticatedWorkspace({
      OALO_ENVIRONMENT: "local",
      ...stubSynthetic,
    }).ui;

    expect(overview.attention.length).toBeGreaterThan(0);
    expect(overview.recentActivity.length).toBeGreaterThan(0);
    expect(overview.activeWork.length).toBeGreaterThan(0);
    expect(overview.metrics.some((metric) => "value" in metric)).toBe(true);
    expect(session.location.displayName).toBe("Prairie Home Lending");
  });

  it("allows the explicit review surface in staging when providers stay stubbed", () => {
    expect(
      authenticatedWorkspaceMode({
        OALO_ENVIRONMENT: "staging",
        ...stubSynthetic,
        [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
      }),
    ).toBe("review");
  });

  it("does not treat a truthy review flag as authorization", () => {
    expect(
      isReviewSurfaceAuthorized({
        OALO_ENVIRONMENT: "production",
        ...stubSynthetic,
        [OALO_REVIEW_SURFACE_ENV]: "true",
      }),
    ).toBe(false);
    expect(canRenderReviewSurface({ OALO_ENVIRONMENT: "production", ...stubSynthetic })).toBe(
      false,
    );
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

  it("fails closed when review is authorized but providers are not stubbed", () => {
    expect(() =>
      authenticatedWorkspaceMode({
        OALO_ENVIRONMENT: "production",
        OALO_PROVIDER_MODE: "live",
        OALO_SYNTHETIC_DATA_ONLY: "true",
        [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
      }),
    ).toThrow(AuthenticatedWorkspaceUnavailableError);
  });

  it("fails closed when review is authorized but synthetic-only is disabled", () => {
    expect(() =>
      authenticatedWorkspaceMode({
        OALO_ENVIRONMENT: "production",
        OALO_PROVIDER_MODE: "stub",
        OALO_SYNTHETIC_DATA_ONLY: "false",
        [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
      }),
    ).toThrow(AuthenticatedWorkspaceUnavailableError);
  });
});
