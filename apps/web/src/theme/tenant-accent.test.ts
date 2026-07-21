import { describe, expect, it } from "vitest";

import {
  DEFAULT_TENANT_ACCENT_KEY,
  TEAL_TENANT_ACCENT_KEY,
  getTenantAccent,
  getTenantAccentCssVariables,
  resolveServerTenantAccentKey,
  validateTenantAccent,
} from "./tenant-accent.js";

describe("tenant accent validation", () => {
  it("accepts the complete, contrast-safe server allowlist entry", () => {
    const result = validateTenantAccent(getTenantAccent(DEFAULT_TENANT_ACCENT_KEY));
    expect(result.valid).toBe(true);
  });

  it("rejects incomplete light and dark pairs", () => {
    const result = validateTenantAccent({
      light: { action: "#000000", actionHover: "#000000", onAction: "#ffffff" },
    });

    expect(result).toMatchObject({ valid: false });
  });

  it("rejects action colors that fail WCAG AA contrast", () => {
    const result = validateTenantAccent({
      light: { action: "#ffffff", actionHover: "#ffffff", onAction: "#ffffff" },
      dark: { action: "#ffffff", actionHover: "#ffffff", onAction: "#ffffff" },
    });

    expect(result).toMatchObject({ valid: false, reason: expect.stringContaining("contrast") });
  });

  it("falls back for unknown or untrusted tenant keys", () => {
    expect(resolveServerTenantAccentKey('untrusted-selector"]{color:red}')).toBe(
      DEFAULT_TENANT_ACCENT_KEY,
    );
    expect(resolveServerTenantAccentKey({ key: DEFAULT_TENANT_ACCENT_KEY })).toBe(
      DEFAULT_TENANT_ACCENT_KEY,
    );
  });

  it("projects an accepted non-default catalog entry to both semantic theme pairs", () => {
    const variables = getTenantAccentCssVariables(
      resolveServerTenantAccentKey(TEAL_TENANT_ACCENT_KEY),
    );

    expect(variables).toMatchObject({
      "--tenant-accent-light-action": "#087f5b",
      "--tenant-accent-light-action-hover": "#056c4c",
      "--tenant-accent-light-on-action": "#ffffff",
      "--tenant-accent-dark-action": "#5ee0aa",
      "--tenant-accent-dark-action-hover": "#46c98f",
      "--tenant-accent-dark-on-action": "#07111f",
    });
  });

  it("projects the approved default when an arbitrary selector is rejected", () => {
    const rejected = getTenantAccentCssVariables(resolveServerTenantAccentKey("not-allowlisted"));
    const approvedDefault = getTenantAccentCssVariables(DEFAULT_TENANT_ACCENT_KEY);

    expect(rejected).toEqual(approvedDefault);
  });
});
