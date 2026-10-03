import { describe, expect, it } from "vitest";

import { SetupProfileSchema, parseStoredProfile } from "./profile.js";

/**
 * The `setup_profile.v1` schema (PRD-006c D4, kept by PRD-009b D4). What is left of the profile
 * after the walkthrough went is its shape: a strict, bounded object that cannot carry the tenant
 * boundary's own names.
 */

describe("setup profile", () => {
  it("refuses a body carrying the tenant boundary's own names", () => {
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        locationId: "00000000-0000-4000-8000-000000000801",
      }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        userId: "00000000-0000-4000-8000-000000000811",
      }).success,
    ).toBe(false);
  });

  it("bounds every field", () => {
    expect(
      SetupProfileSchema.safeParse({ displayName: "", company: "Northgate Lending" }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "x".repeat(121),
        company: "Northgate Lending",
      }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        phone: "5".repeat(41),
      }).success,
    ).toBe(false);
  });

  it("reads a stored profile, and drops the surrounding space the way the schema trims it", () => {
    expect(
      parseStoredProfile({
        displayName: "  Dana Reyes  ",
        company: "Northgate Lending",
        nmlsNumber: "123456",
      }),
    ).toEqual({ displayName: "Dana Reyes", company: "Northgate Lending", nmlsNumber: "123456" });
  });

  it("treats a stored value it cannot read as no profile at all", () => {
    expect(parseStoredProfile({ displayName: 7 })).toBeUndefined();
    expect(parseStoredProfile(undefined)).toBeUndefined();
  });
});
