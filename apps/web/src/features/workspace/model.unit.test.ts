import { describe, expect, it } from "vitest";
import { previewPaths } from "../dashboard-preview/model.js";
import {
  workspaceRoutes,
  WorkspacePreferenceCommandSchema,
  messageKeys,
  PartnerSchema,
} from "./model.js";
describe("authenticated workspace contracts", () => {
  it("covers every dashboard destination that survives, and none that PRD-009f D1 removed", () => {
    for (const path of Object.keys(previewPaths))
      expect(Object.hasOwn(workspaceRoutes, path), path).toBe(true);
    expect(Object.keys(workspaceRoutes).sort()).toEqual([
      "/partners",
      "/settings",
      "/settings/billing",
      "/settings/routing",
    ]);
    for (const removed of [
      "/marketing",
      "/marketing/property-sites",
      "/marketing/creative",
      "/marketing/ads",
      "/marketing/messaging",
      "/marketing/blueprints",
      "/leads",
      "/leads/pipeline",
      "/automations",
      "/marketplace",
      "/settings/profile",
      "/settings/team",
      "/unknown",
    ]) {
      expect(Object.hasOwn(workspaceRoutes, removed), removed).toBe(false);
      expect(Object.hasOwn(previewPaths, removed), removed).toBe(false);
    }
  });
  it("still reads a saved message draft, though nothing in the product edits one any more", () => {
    for (const key of messageKeys) {
      expect(
        WorkspacePreferenceCommandSchema.safeParse({
          key,
          expectedRevision: null,
          value: { subject: "", body: "A saved draft." },
        }).success,
        key,
      ).toBe(true);
    }
  });
  it("rejects contact and command data outside the editable contract", () => {
    expect(
      PartnerSchema.safeParse({
        id: "external-id",
        name: "Test",
        company: "Test",
        email: "",
        phone: "",
      }).success,
    ).toBe(false);
    expect(
      WorkspacePreferenceCommandSchema.safeParse({
        key: "billing",
        expectedRevision: null,
        value: {},
      }).success,
    ).toBe(false);
    expect(
      WorkspacePreferenceCommandSchema.safeParse({
        key: "invitation_sms",
        expectedRevision: null,
        actorId: "someone",
        value: { subject: "", body: "Test" },
      }).success,
    ).toBe(false);
  });
});

describe("the Brand NMLS numbers (verifier, 2026-10-02)", () => {
  const brand = {
    name: "Casey Rivera",
    company: "Evergreen Example Lending",
    email: "",
    phone: "",
    nmls: "123456",
    companyNmls: "",
    tagline: "",
  };
  const command = (value: typeof brand) =>
    WorkspacePreferenceCommandSchema.safeParse({ key: "brand", expectedRevision: null, value });

  it("saves an NMLS number of 4 to 12 digits, or none", () => {
    for (const nmls of ["", "1234", "123456789012"]) {
      expect(command({ ...brand, nmls }).success, nmls).toBe(true);
      expect(command({ ...brand, companyNmls: nmls }).success, nmls).toBe(true);
    }
  });

  it("refuses one of 1 to 3 digits for the person or the company", () => {
    for (const nmls of ["1", "12", "123"]) {
      expect(command({ ...brand, nmls }).success, nmls).toBe(false);
      expect(command({ ...brand, companyNmls: nmls }).success, nmls).toBe(false);
    }
  });
});
