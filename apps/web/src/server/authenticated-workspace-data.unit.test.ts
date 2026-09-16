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
  canRenderSyntheticDemo,
  isReviewSurfaceAuthorized,
  loadAuthenticatedWorkspace,
} from "./authenticated-workspace-data.js";

const stubSynthetic = {
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
} as const;

/** Asserted as a literal so a reworded next safe action has to be reviewed, not silently adopted. */
const REVIEW_NEXT_SAFE_ACTION_TEXT =
  "Connect HighLevel, Meta, and Stripe in a separately authorized environment.";

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

  it("collapses every onboarding item to the model's own no-observation state", () => {
    const { onboarding } = loadAuthenticatedWorkspace(reviewProduction).ui;
    const items = [...onboarding.getConnected, ...onboarding.launchReadiness];

    expect(items).toHaveLength(9);
    for (const item of items) {
      expect(item.state).toBe("not_started");
      expect("evidence" in item).toBe(false);
      expect(item.freshness).toBe("No live observation");
    }
    expect(onboarding.getConnected.map((item) => item.id)).toEqual([
      "install_permissions",
      "brand_compliance",
      "ghl_routing",
      "meta_connection",
      "team_responsibilities",
    ]);
  });

  it("removes every observed grant claim from the review permission groups", () => {
    const { onboarding } = loadAuthenticatedWorkspace(reviewProduction).ui;

    expect(onboarding.permissionGroups.map((group) => group.category)).toEqual([
      "required",
      "granted",
      "missing",
      "optional",
    ]);
    for (const group of onboarding.permissionGroups) {
      expect(group.description).toMatch(/has an observed grant state/u);
      for (const capability of group.capabilities) {
        expect(capability.evidence).toMatch(/^No evidence\./u);
        expect(capability.impact).toMatch(/^Not evaluated\./u);
        expect(capability.nextAction).toBe(REVIEW_NEXT_SAFE_ACTION_TEXT);
      }
    }
  });

  it("collapses every brand value, confirmation, and suggestion in review mode", () => {
    const { brand } = loadAuthenticatedWorkspace(reviewProduction);

    expect(brand.activeLocation.displayName).toBe(REVIEW_LOCATION_DISPLAY_NAME);
    expect(brand.canonicalProfile.version).toBe("brand-v0-not-connected");
    expect(
      brand.canonicalProfile.fields.every((field) => field.value.startsWith("Not saved.")),
    ).toBe(true);
    expect(brand.canonicalProfile.requiredFields.every((field) => field.state === "missing")).toBe(
      true,
    );
    expect(
      brand.aiAssistance.suggestions.every((suggestion) =>
        suggestion.proposedValue.startsWith("Not generated."),
      ),
    ).toBe(true);
    expect(JSON.stringify(brand)).not.toContain("Alex Morgan");
    expect(JSON.stringify(brand)).not.toContain("Prairie Home Lending");
  });

  it("keeps the brand policy the product declares rather than hiding the surface", () => {
    const { brand } = loadAuthenticatedWorkspace(reviewProduction);

    expect(brand.aiAssistance.protectedFieldGroups).toContain("NMLS and licenses");
    expect(brand.canonicalProfile.fields.map((field) => field.label)).toContain("NMLS display");
    expect(brand.canonicalProfile.requiredFields.length).toBeGreaterThan(4);
  });

  it("leaves the demo-rich synthetic local workspace untouched", () => {
    const localWorkspace = loadAuthenticatedWorkspace({
      OALO_ENVIRONMENT: "local",
      ...stubSynthetic,
    });
    const { overview, session, onboarding } = localWorkspace.ui;

    expect(overview.attention.length).toBeGreaterThan(0);
    expect(overview.recentActivity.length).toBeGreaterThan(0);
    expect(overview.activeWork.length).toBeGreaterThan(0);
    expect(overview.metrics.some((metric) => "value" in metric)).toBe(true);
    expect(session.location.displayName).toBe("Prairie Home Lending");
    expect(onboarding.getConnected.some((item) => item.state === "complete")).toBe(true);
    expect(onboarding.permissionGroups.map((group) => group.label)).toEqual([
      "Required",
      "Granted",
      "Missing",
      "Optional",
    ]);
    expect(localWorkspace.brand.canonicalProfile.version).toBe("brand-v3");
    expect(
      localWorkspace.brand.canonicalProfile.requiredFields.some(
        (field) => field.state === "confirmed",
      ),
    ).toBe(true);
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

  it("serves the public synthetic artifact only in an explicit synthetic demo deployment", () => {
    expect(canRenderSyntheticDemo({ OALO_ENVIRONMENT: "local", ...stubSynthetic })).toBe(true);
    expect(canRenderSyntheticDemo({ OALO_ENVIRONMENT: "preview", ...stubSynthetic })).toBe(true);

    // Review mode publishes nothing, so the artifact route must not serve a property.
    expect(
      canRenderSyntheticDemo({
        OALO_ENVIRONMENT: "preview",
        ...stubSynthetic,
        [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
      }),
    ).toBe(false);

    // An environment the mode function refuses to classify must serve nothing, not the fixture.
    expect(
      canRenderSyntheticDemo({
        OALO_ENVIRONMENT: "production",
        OALO_PROVIDER_MODE: "contract-test",
        OALO_SYNTHETIC_DATA_ONLY: "false",
      }),
    ).toBe(false);
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
