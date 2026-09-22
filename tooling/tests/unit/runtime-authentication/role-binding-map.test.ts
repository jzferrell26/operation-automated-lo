import {
  DATABASE_BINDING_ROLES,
  SESSION_APPLICATION_ROLES,
  applicationRoleForDatabaseRole,
  databaseRoleForApplicationRole,
  isDatabaseBindingRole,
  isSessionApplicationRole,
} from "@oalo/auth";
import { ApplicationRoleSchema } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

/**
 * PRD-005a D2 and 005A-AC-007. The map is exhaustive in both directions, and the two entries that
 * deliberately map to nothing are asserted rather than left implicit: a `realtor_collaborator`
 * binding grants no session, and `platform_support` is backed by no binding.
 */

describe("role binding map", () => {
  it("covers all six database roles and all six application roles", () => {
    expect([...DATABASE_BINDING_ROLES].sort()).toEqual(
      [
        "analyst",
        "approver",
        "creator",
        "location_admin",
        "publisher",
        "realtor_collaborator",
      ].sort(),
    );
    expect([...SESSION_APPLICATION_ROLES].sort()).toEqual(
      [
        "campaign_approver",
        "campaign_creator",
        "campaign_publisher",
        "location_admin",
        "platform_support",
        "viewer",
      ].sort(),
    );
    for (const role of SESSION_APPLICATION_ROLES) {
      expect(ApplicationRoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it.each([
    ["location_admin", "location_admin"],
    ["creator", "campaign_creator"],
    ["approver", "campaign_approver"],
    ["publisher", "campaign_publisher"],
    ["analyst", "viewer"],
  ])("maps the database role %s to the application role %s", (databaseRole, applicationRole) => {
    expect(applicationRoleForDatabaseRole(databaseRole)).toBe(applicationRole);
    expect(databaseRoleForApplicationRole(applicationRole)).toBe(databaseRole);
  });

  it("grants no session role to a realtor collaborator", () => {
    expect(isDatabaseBindingRole("realtor_collaborator")).toBe(true);
    expect(applicationRoleForDatabaseRole("realtor_collaborator")).toBeUndefined();
  });

  it("backs platform support with no binding role", () => {
    expect(isSessionApplicationRole("platform_support")).toBe(true);
    expect(databaseRoleForApplicationRole("platform_support")).toBeUndefined();
  });

  it("round trips every role that has a counterpart", () => {
    for (const databaseRole of DATABASE_BINDING_ROLES) {
      const applicationRole = applicationRoleForDatabaseRole(databaseRole);
      if (applicationRole === undefined) continue;
      expect(databaseRoleForApplicationRole(applicationRole)).toBe(databaseRole);
    }
    for (const applicationRole of SESSION_APPLICATION_ROLES) {
      const databaseRole = databaseRoleForApplicationRole(applicationRole);
      if (databaseRole === undefined) continue;
      expect(applicationRoleForDatabaseRole(databaseRole)).toBe(applicationRole);
    }
  });

  it.each([undefined, null, 42, "", "admin", "CREATOR", "campaign_creator"])(
    "refuses %s as a database binding role",
    (value) => {
      expect(isDatabaseBindingRole(value)).toBe(false);
      expect(applicationRoleForDatabaseRole(value)).toBeUndefined();
    },
  );

  it.each([undefined, null, 42, "", "creator", "VIEWER"])(
    "refuses %s as an application session role",
    (value) => {
      expect(isSessionApplicationRole(value)).toBe(false);
      expect(databaseRoleForApplicationRole(value)).toBeUndefined();
    },
  );
});
