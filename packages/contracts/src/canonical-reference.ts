import { z } from "zod";

/**
 * PRD-005a D1. The one runtime reference format: `<prefix>_<32 lowercase hex characters>`, where
 * the hex is the UUID of the backing row with its hyphens removed.
 *
 * Every canonical value is 38 to 45 characters of lowercase letters, digits, and a single
 * underscore, so one spelling satisfies all four consumers at once:
 *
 * - `SafeTenantReferenceSchema` (`^[a-z][a-z0-9_-]{2,95}$`) in `tenant-installation.ts`
 * - the opaque pattern `freezeAuthenticatedPrincipal` enforces (8 to 128 characters,
 *   `^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$`) in `@oalo/application`
 * - `OpaqueReferenceSchema` in `campaign-foundation.ts` and the matching campaign table check
 *   constraints
 * - the embedded token's safe-reference claim validation
 *
 * The reference is derived rather than stored, so no foundation table gains a ref column and two
 * rows can never share a reference. It is never trusted from the browser: the principal comes from
 * the verified session, and tenant authorization keys on the UUID under row level security.
 */

export const CANONICAL_REFERENCE_KINDS = Object.freeze([
  "location",
  "actor",
  "installation",
  "session",
] as const);

export type CanonicalReferenceKind = (typeof CANONICAL_REFERENCE_KINDS)[number];

/**
 * A distinct failure class so a malformed reference is refused at the composition boundary with a
 * nameable cause, rather than collapsing into the generic principal-binding rejection.
 */
export class CanonicalReferenceError extends Error {
  public readonly kind: CanonicalReferenceKind;

  public constructor(kind: CanonicalReferenceKind) {
    super(`Value is not a canonical ${kind} reference.`);
    this.name = "CanonicalReferenceError";
    this.kind = kind;
  }
}

const CANONICAL_HEX_PATTERN = /^[0-9a-f]{32}$/u;

/** Lowercase only, and version 1 to 8 with an RFC 4122 variant, matching the principal contract. */
const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export const CanonicalReferenceSchema = z
  .string()
  .regex(/^(?:location|actor|installation|session)_[0-9a-f]{32}$/u);

export interface CanonicalReferenceCodec {
  readonly kind: CanonicalReferenceKind;
  readonly prefix: string;
  readonly schema: z.ZodType<string>;
  /** Throws `CanonicalReferenceError` when `uuid` is not a lowercase canonical UUID. */
  format(uuid: string): string;
  /** Throws `CanonicalReferenceError` when `reference` is not canonical for this kind. */
  parse(reference: string): string;
  /** `undefined` instead of throwing, for boundaries that already fail closed on `undefined`. */
  tryParse(reference: unknown): string | undefined;
}

function toUuid(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function createCanonicalReferenceCodec(kind: CanonicalReferenceKind): CanonicalReferenceCodec {
  const prefix = `${kind}_`;
  const pattern = new RegExp(`^${kind}_[0-9a-f]{32}$`, "u");
  const schema = z.string().regex(pattern);

  function tryParse(reference: unknown): string | undefined {
    if (typeof reference !== "string" || !pattern.test(reference)) return undefined;
    const hex = reference.slice(prefix.length);
    if (!CANONICAL_HEX_PATTERN.test(hex)) return undefined;
    const uuid = toUuid(hex);
    return CANONICAL_UUID_PATTERN.test(uuid) ? uuid : undefined;
  }

  return Object.freeze({
    kind,
    prefix,
    schema,
    format(uuid: string): string {
      if (!CANONICAL_UUID_PATTERN.test(uuid)) throw new CanonicalReferenceError(kind);
      return `${prefix}${uuid.replaceAll("-", "")}`;
    },
    parse(reference: string): string {
      const uuid = tryParse(reference);
      if (uuid === undefined) throw new CanonicalReferenceError(kind);
      return uuid;
    },
    tryParse,
  });
}

export const locationReference = createCanonicalReferenceCodec("location");
export const actorReference = createCanonicalReferenceCodec("actor");
export const installationReference = createCanonicalReferenceCodec("installation");
export const sessionReference = createCanonicalReferenceCodec("session");

export const CANONICAL_REFERENCE_CODECS: Readonly<
  Record<CanonicalReferenceKind, CanonicalReferenceCodec>
> = Object.freeze({
  location: locationReference,
  actor: actorReference,
  installation: installationReference,
  session: sessionReference,
});

export const formatLocationRef = locationReference.format;
export const parseLocationRef = locationReference.parse;
export const formatActorRef = actorReference.format;
export const parseActorRef = actorReference.parse;
export const formatInstallationRef = installationReference.format;
export const parseInstallationRef = installationReference.parse;
export const formatSessionRef = sessionReference.format;
export const parseSessionRef = sessionReference.parse;
