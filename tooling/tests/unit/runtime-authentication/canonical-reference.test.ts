import { freezeAuthenticatedPrincipal } from "@oalo/application";
import {
  CANONICAL_REFERENCE_CODECS,
  CANONICAL_REFERENCE_KINDS,
  CanonicalReferenceError,
  CanonicalReferenceSchema,
  OpaqueReferenceSchema,
  SafeTenantReferenceSchema,
  formatActorRef,
  formatInstallationRef,
  formatLocationRef,
  formatSessionRef,
  parseActorRef,
  parseLocationRef,
  type CanonicalReferenceKind,
} from "@oalo/contracts";
import { describe, expect, it } from "vitest";

/**
 * PRD-005a D1 and 005A-AC-009. The canonical format exists to satisfy three independently authored
 * validators at once, so this suite checks it against each of them directly rather than trusting
 * the character count in the design note.
 */

const LOCATION_ID = "0c9a5b1e-4d2f-4a7b-9c3d-1e2f3a4b5c6d";
const ACTOR_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const INSTALLATION_ID = "2b3c4d5e-6f70-4b8c-9d0e-1f2a3b4c5d6e";
const SESSION_ID = "3c4d5e6f-7081-4c9d-8e0f-2a3b4c5d6e7f";

describe("canonical reference format", () => {
  it.each(CANONICAL_REFERENCE_KINDS)("round trips a %s reference through its UUID", (kind) => {
    const codec = CANONICAL_REFERENCE_CODECS[kind];
    const uuid = {
      location: LOCATION_ID,
      actor: ACTOR_ID,
      installation: INSTALLATION_ID,
      session: SESSION_ID,
    }[kind as CanonicalReferenceKind];

    const reference = codec.format(uuid);

    expect(reference).toBe(`${kind}_${uuid.replaceAll("-", "")}`);
    expect(codec.parse(reference)).toBe(uuid);
    expect(codec.tryParse(reference)).toBe(uuid);
  });

  it.each(CANONICAL_REFERENCE_KINDS)("makes a %s reference satisfy every consumer", (kind) => {
    const codec = CANONICAL_REFERENCE_CODECS[kind];
    const uuid = {
      location: LOCATION_ID,
      actor: ACTOR_ID,
      installation: INSTALLATION_ID,
      session: SESSION_ID,
    }[kind as CanonicalReferenceKind];
    const reference = codec.format(uuid);

    expect(SafeTenantReferenceSchema.safeParse(reference).success).toBe(true);
    expect(OpaqueReferenceSchema.safeParse(reference).success).toBe(true);
    expect(CanonicalReferenceSchema.safeParse(reference).success).toBe(true);
    expect(reference.length).toBeGreaterThanOrEqual(38);
    expect(reference.length).toBeLessThanOrEqual(45);
  });

  it("binds a principal built entirely from canonical references", () => {
    const principal = freezeAuthenticatedPrincipal({
      actorRef: formatActorRef(ACTOR_ID),
      actorId: ACTOR_ID,
      locationRef: formatLocationRef(LOCATION_ID),
      locationId: LOCATION_ID,
      installationRef: formatInstallationRef(INSTALLATION_ID),
      role: "campaign_creator",
      roleVersion: 1,
      sessionId: formatSessionRef(SESSION_ID),
      authenticationMode: "first_party",
    });

    expect(principal.locationRef).toBe(formatLocationRef(LOCATION_ID));
    expect(parseLocationRef(principal.locationRef)).toBe(LOCATION_ID);
    expect(parseActorRef(principal.actorRef)).toBe(ACTOR_ID);
  });

  /**
   * The four shapes the review named. Each is refused with `CanonicalReferenceError`, a class
   * distinct from the generic principal rejection, so a malformed reference is diagnosable rather
   * than an undifferentiated 401.
   */
  it.each([
    ["a hyphenated reference", "location-0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6d"],
    ["a seven-character reference", "loc_abc"],
    ["an uppercase-hex reference", "location_0C9A5B1E4D2F4A7B9C3D1E2F3A4B5C6D"],
    ["a 31-hex reference", "location_0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6"],
    ["a 33-hex reference", "location_0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6dd"],
    ["another kind's reference", "actor_0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6d"],
  ])("rejects %s at the composition boundary", (_label, value) => {
    expect(() => parseLocationRef(value)).toThrow(CanonicalReferenceError);
    expect(CANONICAL_REFERENCE_CODECS.location.tryParse(value)).toBeUndefined();
  });

  it("rejects a hex string whose UUID form is not a valid version or variant", () => {
    const badVersion = `location_${"0c9a5b1e4d2f0a7b9c3d1e2f3a4b5c6d"}`;

    expect(CANONICAL_REFERENCE_CODECS.location.tryParse(badVersion)).toBeUndefined();
    expect(() => parseLocationRef(badVersion)).toThrow(CanonicalReferenceError);
  });

  it.each([
    "0C9A5B1E-4D2F-4A7B-9C3D-1E2F3A4B5C6D",
    "0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6d",
    "not-a-uuid",
    "",
  ])("refuses to format the non-canonical UUID %s", (value) => {
    expect(() => formatLocationRef(value)).toThrow(CanonicalReferenceError);
  });

  it("names the kind on the error so a failure is diagnosable", () => {
    try {
      parseActorRef("actor_short");
      expect.unreachable("parseActorRef must reject a non-canonical reference");
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalReferenceError);
      expect((error as CanonicalReferenceError).kind).toBe("actor");
    }
  });
});
