import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadSyntheticBrandProfile } from "../../../features/brand/model/synthetic-brand-profile.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../server/authenticated-workspace-data.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../review-surface-sweep.js";

/**
 * Every synthetic brand fixture string that may legitimately reach the rendered review brand
 * route. The fixture is a confirmed brand profile for a named loan officer at a named company,
 * with confirmed compliance evidence and model-generated suggestions. None of that exists on a
 * not-connected deployment, so only the product's own field names, its protected-field policy,
 * and closed enums survive.
 */
const brandAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "canonicalProfile.fields[*].label",
    because: "Names a canonical profile field this product maintains. No value is carried.",
  },
  {
    path: "canonicalProfile.fields[*].id",
    because: "Field slug used as the React key; never rendered as text.",
  },
  {
    path: "canonicalProfile.requiredFields[*].label",
    because: "Names a field the selected blueprint requires. Product policy, not observed state.",
  },
  {
    path: "canonicalProfile.requiredFields[*].state",
    value: "missing",
    because: "Closed enum, and review mode reports every required field as missing.",
  },
  {
    path: "aiAssistance.suggestions[*].label",
    because: "Names the brand field the assistant can propose. No proposal is carried.",
  },
  {
    path: "aiAssistance.protectedFieldGroups[*]",
    because:
      "The product's own never-accepted-from-AI policy. A Marketplace reviewer should see it and it claims nothing about a tenant.",
  },
  { path: "safety.dataMode", because: "Literal 'synthetic' fixed by runtimeSafetySchema." },
  {
    path: "canonicalProfile.requiredFields[*].state",
    value: "confirmed",
    because:
      "Substring of the not-connected field copy 'You haven't confirmed this yet.' (PRD-006b D4); no required field is reported confirmed here, which the next test asserts directly.",
  },
];

beforeEach(() => {
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderBrand(environment: string, reviewSurface: string | undefined) {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
  const workspace = loadAuthenticatedWorkspace();
  const { container } = render(<BrandProfileScreen profile={workspace.brand} />);
  return { container, workspace };
}

describe("authenticated brand route", () => {
  it("sweeps the whole brand fixture rather than a curated list of profile keys", () => {
    const profile = loadSyntheticBrandProfile();

    expect(collectFixtureStrings(profile).length).toBeGreaterThan(80);
    expect(forbiddenReviewStrings(profile, brandAllowances).length).toBeGreaterThan(40);
    expect(staleAllowances(profile, brandAllowances)).toEqual([]);
  });

  it("keeps every unallowed brand fixture string out of the rendered review brand route", () => {
    const { container } = renderBrand("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const forbidden = forbiddenReviewStrings(loadSyntheticBrandProfile(), brandAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  it("reports no confirmed brand value and no confirmed required field", () => {
    const { container, workspace } = renderBrand("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const { canonicalProfile } = workspace.brand;

    expect(canonicalProfile.fields.every((field) => field.value === "Not saved yet")).toBe(true);
    expect(canonicalProfile.requiredFields.every((field) => field.state === "missing")).toBe(true);
    expect(container.querySelectorAll("[data-profile-field-state='confirmed']")).toHaveLength(0);
    expect(container.textContent).toContain("your workspace");
    for (const identity of ["Alex Morgan", "Prairie Home Lending", "NMLS 0000000"]) {
      expect(container.textContent).not.toContain(identity);
    }
  });

  it("reports the AI assistant as having generated nothing", () => {
    const { workspace } = renderBrand("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const { aiAssistance } = workspace.brand;

    expect(
      aiAssistance.suggestions.every(
        (suggestion) =>
          suggestion.proposedValue === "No suggestion yet. Add a sample of your marketing first.",
      ),
    ).toBe(true);
    expect(
      aiAssistance.approvedSamples.every((sample) =>
        sample.displayName.includes("nothing added yet"),
      ),
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Nothing saved from a suggestion yet.");
  });

  it("keeps the demo-rich synthetic brand profile for local development", () => {
    const { container } = renderBrand("local", undefined);
    const forbidden = forbiddenReviewStrings(loadSyntheticBrandProfile(), brandAllowances);

    expect(container.textContent).toContain("Alex Morgan");
    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(25);
  });
});
