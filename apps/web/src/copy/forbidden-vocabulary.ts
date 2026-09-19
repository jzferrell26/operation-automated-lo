/**
 * The words and shapes a user must never read, in one place, so the source guard and the
 * rendered-output guard cannot drift apart.
 *
 * This is PRD-006b D2, as narrowed by section 3 of
 * `library/knowledge/private/standards/user-language-contract.md`. Five D2 entries carry a
 * qualifier in the PRD's table ("contract (as a software noun)", "route (as a noun for a page)",
 * "region (as a noun for a page area)", "capability (as an access noun)", and the instruction to
 * name the provider). None of those five has a user-facing sense in this product, so each is banned
 * outright here rather than guessed at by the guard. The one word with a genuine user-facing sense
 * was the geographic "region" in ad targeting, and the product says "area" there instead, so no
 * exception is needed.
 *
 * Terms match case-insensitively on a word boundary, so "Synthetic", "synthetically", and
 * "SYNTHETIC" all fail while "regional" does not accidentally pass a ban on "region".
 */

/** Single words and phrases that may never appear in anything a user reads. */
export const FORBIDDEN_TERMS: readonly string[] = Object.freeze([
  // Deployment and testing.
  "review surface",
  "review mode",
  "demo mode",
  "workspace mode",
  "synthetic",
  "fixture",
  "harness",
  "scaffold",
  "stub",
  "contract",
  "deterministic",
  "projection",
  "server-shaped",
  "evidence",
  "verifier",
  "runtime",
  "composition",
  "handler",
  "payload",
  "route",
  "region",
  // People and access.
  "operator",
  "persona",
  "principal",
  "tenant",
  "resolver",
  "seat",
  "entitlement",
  "capability",
  "capabilities",
  "grant state",
  // Sessions and security.
  "session ref",
  "sessionref",
  "session id",
  "first-party session",
  "verified session",
  "csrf",
  "correlation",
  "exception code",
  "idempotent",
  "row version",
  "manifest hash",
  "preflight result hash",
  "canonical",
  "definer",
  // Data words.
  "provider",
  "preflight",
  "persisted",
  "persist",
  "immutable",
  "frozen",
  "freeze",
  "compile",
  "mutation",
  "observation",
]);

/**
 * Shapes rather than words: a reference, a hash, an environment name, a code, or a state token.
 * These may appear only inside the collapsed "Details for support" region, which the rendered guard
 * excludes before it scans.
 */
export const FORBIDDEN_IDENTIFIER_PATTERNS: readonly Readonly<{
  name: string;
  pattern: RegExp;
}>[] = Object.freeze([
  {
    name: "internal reference prefix",
    pattern:
      /\b(?:location|actor|principal|installation|session|campaign|correlation)_[a-z0-9]{6,}\b/iu,
  },
  { name: "synthetic slug", pattern: /\b(?:syn|synthetic)-[a-z0-9-]+\b/iu },
  {
    name: "UUID",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu,
  },
  { name: "64-hex hash", pattern: /\b[0-9a-f]{64}\b/iu },
  { name: "environment variable name", pattern: /\b(?:OALO|NEXT_PUBLIC)_[A-Z0-9_]+\b/u },
  { name: "SCREAMING_SNAKE code", pattern: /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,}\b/u },
  {
    name: "snake_case state or role token",
    pattern:
      /\b(?:location_admin|campaign_creator|campaign_approver|campaign_publisher|platform_support|realtor_collaborator|awaiting_approval|not_started|in_progress|permission_restricted|setup_required|not_connected|needs_confirmation|approved_for_profile_assistance|unavailable_data|restricted_viewer|authorized_agency|healthy_without_campaign|provider_degraded|setup_incomplete|new_workspace|safe_retry|route_error)\b/u,
  },
]);

/**
 * The dashes the house style forbids in prose.
 *
 * Built from their code points rather than written out, because a file that bans a character and
 * then contains it fails its own guard, and Prettier rewrites a unicode escape in a string literal
 * back into the character itself.
 */
export const EM_DASH = String.fromCodePoint(0x2014);
export const EN_DASH = String.fromCodePoint(0x2013);

export const FORBIDDEN_DASHES: readonly Readonly<{ name: string; character: string }>[] =
  Object.freeze([
    { name: "em dash", character: EM_DASH },
    { name: "en dash", character: EN_DASH },
  ]);

/**
 * One term, matched case-insensitively on a word boundary, with the plural allowed.
 *
 * PRD-006b D2 bans each term "in any case, tense, or compound", and "fixtures" is the same word as
 * "fixture" to the person reading it. The suffix is limited to `s` and `es` so that banning
 * "region" does not also ban "regional", which would be a different claim.
 */
function termPattern(term: string): RegExp {
  const escaped = term.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?:es|s)?(?![\\w-])`, "iu");
}

export type VocabularyHit = Readonly<{ kind: "term" | "identifier" | "dash"; detail: string }>;

/** Every contract violation in one piece of user-facing text, in the order they are checked. */
export function findVocabularyHits(text: string): readonly VocabularyHit[] {
  const hits: VocabularyHit[] = [];

  for (const term of FORBIDDEN_TERMS) {
    if (termPattern(term).test(text)) {
      hits.push({ kind: "term", detail: term });
    }
  }
  for (const { name, pattern } of FORBIDDEN_IDENTIFIER_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      hits.push({ kind: "identifier", detail: `${name}: ${match[0]}` });
    }
  }
  for (const { name, character } of FORBIDDEN_DASHES) {
    if (text.includes(character)) {
      hits.push({ kind: "dash", detail: name });
    }
  }

  return hits;
}
