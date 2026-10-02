import { describe, expect, it } from "vitest";

import {
  INSTALLATION_STATUSES,
  brandChecklistState,
  buildHomeChecklist,
  highLevelConnectionState,
  type InstallationStatus,
} from "./home-checklist.js";

/**
 * PRD-009b D2 and 009B-AC-004 and 009B-AC-005.
 *
 * The three items are derived from saved records only. This file is the table of D2, row by row:
 * the six statuses the installation table allows (`platform_foundation.sql:168-169`) and none, and
 * the three brand shapes. The Postgres half (`home-reads.postgres.test.ts`) seeds the same rows and
 * asserts the same answers through the real read.
 */

describe("Connect HighLevel (D2, row one)", () => {
  it("lists every status the installation table allows, so a new one cannot slip past this table", () => {
    expect([...INSTALLATION_STATUSES]).toEqual([
      "pending",
      "active",
      "missing_scope",
      "reconnect_required",
      "revoked",
      "uninstalled",
    ]);
  });

  it.each<[InstallationStatus, "connected" | "needs_attention" | "not_connected"]>([
    ["active", "connected"],
    ["missing_scope", "needs_attention"],
    ["reconnect_required", "needs_attention"],
    ["pending", "not_connected"],
    ["revoked", "not_connected"],
    ["uninstalled", "not_connected"],
  ])("reads an installation with status %s as %s", (status, expected) => {
    expect(highLevelConnectionState([status])).toBe(expected);
  });

  it("reads no installation at all as not connected", () => {
    expect(highLevelConnectionState([])).toBe("not_connected");
  });

  it("never lets an older closed installation hide a connected one", () => {
    expect(highLevelConnectionState(["revoked", "active", "uninstalled"])).toBe("connected");
  });

  it("surfaces an installation that needs attention even beside an active one", () => {
    // Telling a person everything is connected while an installation is missing a scope would be
    // the one dishonest reading of two rows, so attention outranks active.
    expect(highLevelConnectionState(["active", "reconnect_required"])).toBe("needs_attention");
  });
});

describe("Add your brand (D2, row three)", () => {
  it("is done when the saved brand has a name and an NMLS number", () => {
    expect(brandChecklistState({ name: "Alex Morgan", nmls: "1234567" })).toBe("done");
  });

  it("needs attention when a brand is saved without an NMLS number", () => {
    expect(brandChecklistState({ name: "Alex Morgan", nmls: "" })).toBe("needs_attention");
  });

  it("is not started when no brand is saved", () => {
    expect(brandChecklistState(undefined)).toBe("not_started");
  });

  it("is not started when the saved brand has no name, whatever else it holds", () => {
    expect(brandChecklistState({ name: "  ", nmls: "1234567" })).toBe("not_started");
  });

  it("needs attention when something is saved and cannot be read, which is not the same as nothing saved", () => {
    expect(brandChecklistState("unreadable")).toBe("needs_attention");
  });

  it("does not count a blank NMLS number made of spaces as a number", () => {
    expect(brandChecklistState({ name: "Alex Morgan", nmls: "   " })).toBe("needs_attention");
  });
});

describe("the checklist as a whole (D2 and 009B-AC-005)", () => {
  it("has the three items of D2, in order, and no Realtor partner item (D-20)", () => {
    const checklist = buildHomeChecklist({ installationStatuses: [], brand: undefined });

    expect(checklist.items.map((item) => item.id)).toEqual(["highlevel", "meta", "brand"]);
    expect(checklist.total).toBe(3);
  });

  it("never reads Meta as connected, because no Meta connection is stored in PRD-009", () => {
    const checklist = buildHomeChecklist({
      installationStatuses: ["active"],
      brand: { name: "Alex Morgan", nmls: "1234567" },
    });

    expect(checklist.items.find((item) => item.id === "meta")?.state).toBe("not_connected");
  });

  it("counts Connected and Done and nothing else", () => {
    expect(buildHomeChecklist({ installationStatuses: [], brand: undefined }).doneCount).toBe(0);
    expect(
      buildHomeChecklist({
        installationStatuses: ["active"],
        brand: { name: "Alex Morgan", nmls: "1234567" },
      }).doneCount,
    ).toBe(2);
    expect(
      buildHomeChecklist({
        installationStatuses: ["missing_scope"],
        brand: { name: "Alex Morgan", nmls: "" },
      }).doneCount,
    ).toBe(0);
  });

  it("says which item needs attention, so the card can open with it marked", () => {
    const checklist = buildHomeChecklist({
      installationStatuses: ["reconnect_required"],
      brand: undefined,
    });

    expect(
      checklist.items.filter((item) => item.state === "needs_attention").map((item) => item.id),
    ).toEqual(["highlevel"]);
  });
});
