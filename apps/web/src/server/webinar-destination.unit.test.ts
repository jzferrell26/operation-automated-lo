import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalCampaignHash } from "@oalo/application";
import { FUNNELS } from "../features/funnels/catalog.js";
import { salesDefaults } from "../features/funnels/sales-content.js";
import {
  validatedWebinarDestination,
  validatedHistoricalWebinarLabels,
} from "./webinar-destination.js";

const now = new Date("2026-10-13T12:00:00Z");
const environment = {
  OALO_APP_URL: "https://example.org",
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: Buffer.alloc(32, 1).toString("base64url"),
};
function fixture(kind: "live-webinar" | "on-demand" = "live-webinar") {
  const catalog = FUNNELS.find((funnel) => funnel.kind === kind)!;
  return {
    publication: {
      id: randomUUID(),
      sourceRevision: randomUUID(),
      active: true,
      createdAt: "2026-10-12T12:00:00Z",
      expiresAt: "2026-11-13T12:00:00Z",
      snapshot: {
        kind,
        fields: {
          ...catalog.defaults,
          eventStartsAt: "2026-10-20T12:00:00Z",
          webinarUrl: "https://example.org/secret-join",
          videoUrl: "https://example.org/private-recording",
          bookingUrl: "https://example.org/book",
          sales: { ...salesDefaults(kind), privacyUrl: "https://example.org/privacy" },
        },
        brand: {
          name: "Example Lender",
          company: "Example Lending",
          nmls: "12345",
          companyNmls: "67890",
          colorPresetId: "navy",
          disclosure: "Equal Housing Opportunity",
        },
      },
    },
    publisherActorRef: "actor_00000000000040008000000000000011",
    frozenDestination: null as unknown,
  };
}
describe("webinar destination full snapshot evidence", () => {
  it("historical labels remain exact and safe after withdrawal, never current eligibility", () => {
    const row = fixture();
    row.frozenDestination = validatedWebinarDestination(row, environment, now);
    row.publication.active = false;
    const result = validatedHistoricalWebinarLabels(row);
    expect(Object.keys(result).sort()).toEqual(["learningSummary", "snapshotHash", "title"]);
    expect(JSON.stringify(result)).not.toContain("secret-join");
    expect(result.snapshotHash).toBe(canonicalCampaignHash(row.publication.snapshot));
    expect(() => validatedWebinarDestination(row, environment, now)).toThrow("DESTINATION_CHANGED");
    row.publication.snapshot.fields.webinarUrl += "-tampered";
    expect(() => validatedHistoricalWebinarLabels(row)).toThrow("DESTINATION_CHANGED");
  });
  it("hashes unredacted material identity without exposing gated URLs", () => {
    const row = fixture(),
      result = validatedWebinarDestination(row, environment, now);
    expect(result.snapshotHash).toBe(canonicalCampaignHash(row.publication.snapshot));
    expect(JSON.stringify(result)).not.toContain("secret-join");
    expect(result.publicUrl).toBe(`${environment.OALO_APP_URL}/f/${row.publication.id}`);
    const changed = structuredClone(row);
    changed.publication.snapshot.fields.webinarUrl += "-changed";
    expect(validatedWebinarDestination(changed, environment, now).snapshotHash).not.toBe(
      result.snapshotHash,
    );
  });
  it("preserves on-demand null event start and refuses non-webinar snapshots", () => {
    expect(
      validatedWebinarDestination(fixture("on-demand"), environment, now).eventStartsAt,
    ).toBeNull();
    const row = fixture();
    Object.assign(row.publication.snapshot, { kind: "buyer" });
    expect(() => validatedWebinarDestination(row, environment, now)).toThrow(
      "DESTINATION_INCOMPLETE",
    );
  });
  it.each([
    "publicUrl",
    "snapshotHash",
    "sourceRevision",
    "publisherActorRef",
    "expiresAt",
    "publishedAt",
    "eventStartsAt",
  ])("refuses changed frozen %s", (field) => {
    const row = fixture(),
      saved = validatedWebinarDestination(row, environment, now);
    const values = {
      publicUrl: `https://changed.example/f/${saved.publicationId}`,
      snapshotHash: "a".repeat(64),
      sourceRevision: randomUUID(),
      publisherActorRef: "actor_00000000000040008000000000000012",
      expiresAt: "2026-11-12T12:00:00Z",
      publishedAt: "2026-10-11T12:00:00Z",
      eventStartsAt: "2026-10-21T12:00:00Z",
    };
    row.frozenDestination = { ...saved, [field]: values[field as keyof typeof values] };
    expect(() => validatedWebinarDestination(row, environment, now)).toThrow("DESTINATION_CHANGED");
  });
  it("accepts exact frozen identity and refuses malformed, inactive, expired and incomplete records", () => {
    const row = fixture();
    row.frozenDestination = validatedWebinarDestination(row, environment, now);
    expect(validatedWebinarDestination(row, environment, now)).toEqual(row.frozenDestination);
    const inactive = fixture();
    inactive.publication.active = false;
    expect(() => validatedWebinarDestination(inactive, environment, now)).toThrow(
      "DESTINATION_CHANGED",
    );
    const expired = fixture();
    expired.publication.expiresAt = now.toISOString();
    expect(() => validatedWebinarDestination(expired, environment, now)).toThrow(
      "DESTINATION_CHANGED",
    );
    const incomplete = fixture();
    incomplete.publication.snapshot.fields.webinarUrl = "";
    expect(() => validatedWebinarDestination(incomplete, environment, now)).toThrow(
      "DESTINATION_INCOMPLETE",
    );
    const past = fixture();
    past.publication.snapshot.fields.eventStartsAt = now.toISOString();
    expect(() => validatedWebinarDestination(past, environment, now)).toThrow(
      "DESTINATION_INCOMPLETE",
    );
    const malformed = fixture();
    malformed.publication.snapshot.fields.eventStartsAt = "not-a-date";
    expect(() => validatedWebinarDestination(malformed, environment, now)).toThrow();
  });
  it.each([
    { OALO_FUNNEL_PUBLICATION: "disabled" },
    { OALO_APP_URL: "https://name:secret@example.org" },
    { OALO_APP_URL: "http://example.org" },
    { OALO_APP_URL: "https://example.org/path" },
    { OALO_FUNNEL_DATA_KEY: "wrong" },
  ])("refuses unusable publication configuration %o", (overrides) => {
    expect(() =>
      validatedWebinarDestination(fixture(), { ...environment, ...overrides }, now),
    ).toThrow("DESTINATION_UNAVAILABLE");
  });
});
