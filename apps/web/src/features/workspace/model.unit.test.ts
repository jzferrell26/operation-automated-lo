import { describe, expect, it } from "vitest";
import { previewPaths } from "../dashboard-preview/model.js";
import {
  workspaceRoutes,
  WorkspacePreferenceCommandSchema,
  starterMessage,
  messageKeys,
  PartnerSchema,
} from "./model.js";
describe("authenticated workspace contracts", () => {
  it("covers every existing dashboard destination and adds a report identity editor", () => {
    for (const path of Object.keys(previewPaths))
      expect(Object.hasOwn(workspaceRoutes, path), path).toBe(true);
    expect(workspaceRoutes["/settings/profile"]).toBe("profile");
    expect(Object.hasOwn(workspaceRoutes, "/unknown")).toBe(false);
  });
  it("starts each channel with explicit placeholder wording, not invented property facts", () => {
    for (const key of messageKeys) {
      const value = starterMessage(key, "Test Officer");
      expect(value.body).toContain("[property address]");
      expect(value.body).toContain("Test Officer");
      expect(value.subject.length > 0).toBe(key.endsWith("_email"));
      expect(
        WorkspacePreferenceCommandSchema.safeParse({ key, expectedRevision: null, value }).success,
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
