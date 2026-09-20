/**
 * Structural leak sweep for the review surface.
 *
 * The sweep is inverted on purpose. It does not enumerate the fixture fields that are dangerous,
 * because that list can only ever describe the fixture as it exists today. It walks the whole
 * frozen fixture, treats every string leaf as dangerous, and requires an explicit justified
 * allowance before a value may reach a review-mode surface. A field added to a fixture later is
 * therefore guarded the moment it exists, and nobody has to remember to update a key list.
 *
 * An allowance is scoped to a normalized fixture path, optionally narrowed to one exact value, so
 * permitting `overview.metrics[*].label` does not also permit a `overview.metrics[*].narrative`
 * added next to it.
 */

import {
  FORBIDDEN_IDENTIFIER_PATTERNS,
  FORBIDDEN_TERMS,
  forbiddenTermPattern,
} from "../../copy/forbidden-vocabulary.js";

/** Normalized fixture path: array indices collapse to `[*]` so one allowance covers one field. */
export type FixtureString = Readonly<{ path: string; value: string }>;

export type ReviewSurfaceAllowance = Readonly<{
  /** Normalized fixture path, for example `overview.health[*].label`. */
  path: string;
  /** When present, only this exact value is allowed at `path`. Omit to allow the whole field. */
  value?: string;
  /** Why this string may legitimately reach a review-mode surface. */
  because: string;
}>;

/**
 * How `leakedReviewStrings` looks for one forbidden value.
 *
 * `substring` is the fixture sweep's rule: a fixture narrative string is a leak wherever it turns
 * up. `word` and `pattern` belong to the user-language contract, which bans a vocabulary and a set
 * of shapes rather than a set of values, so they match on a word boundary or by regular expression.
 *
 * `word` is `forbiddenTermPattern` from the copy module, the same matcher the source guard uses.
 * This file used to build its own, without the inflections, which made the rendered guard strictly
 * weaker on the same term list: "Demo fixtures only." and "These providers are not connected"
 * failed the source guard and passed here.
 */
export type ForbiddenReviewMatch = "substring" | "word" | "pattern";

export type ForbiddenReviewString = Readonly<{
  value: string;
  paths: readonly string[];
  match?: ForbiddenReviewMatch;
}>;

/**
 * Every attribute a reviewer can read without opening devtools. Class names and `data-*` hooks are
 * deliberately excluded: they are implementation handles, not statements about the workspace.
 *
 * `aria-describedby` is handled separately below rather than listed here, because its value is a
 * set of element ids rather than prose: PRD-006b D6 asks for the text of what it names, since that
 * is what a screen reader reads aloud.
 */
const inspectedAttributes = ["alt", "aria-label", "href", "placeholder", "title"] as const;

/**
 * The collapsed region the user-language contract reserves for a version reference, a fingerprint,
 * a rule code, or a support reference (PRD-006b D8, contract section 6). It is closed by default,
 * so it is not part of what a user reads at rest, and it is the one place those values are allowed.
 * The sweep removes it before reading the page, which is what turns "no identifier renders outside
 * this region" into a testable claim rather than a convention.
 */
const SUPPORT_DETAILS_SELECTOR = "[data-support-details]";

export function collectFixtureStrings(fixture: unknown): readonly FixtureString[] {
  const collected: FixtureString[] = [];
  walk(fixture, "", collected);
  return collected;
}

function walk(value: unknown, path: string, collected: FixtureString[]): void {
  if (typeof value === "string") {
    if (value.length > 0) {
      collected.push({ path, value });
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      walk(entry, `${path}[*]`, collected);
    }
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path === "" ? key : `${path}.${key}`, collected);
    }
  }
}

function allows(allowance: ReviewSurfaceAllowance, candidate: FixtureString): boolean {
  return (
    allowance.path === candidate.path &&
    (allowance.value === undefined || allowance.value === candidate.value)
  );
}

/**
 * The user-language contract's own entries: the forbidden vocabulary as word matches and the
 * forbidden identifier shapes as pattern matches (PRD-006b D2 and D6).
 *
 * These carry no allowance model. A fixture string can earn an allowance by naming a route or a
 * region of the product; a contract term cannot, because the contract's claim is that the word
 * itself has no user-facing sense in this product. Where one did, the product changed the word.
 */
export function userLanguageForbiddenStrings(): readonly ForbiddenReviewString[] {
  return [
    ...FORBIDDEN_TERMS.map((term) => ({
      value: term,
      paths: ["user-language-contract:forbidden-vocabulary"],
      match: "word" as const,
    })),
    ...FORBIDDEN_IDENTIFIER_PATTERNS.map(({ name, pattern }) => ({
      value: pattern.source,
      paths: [`user-language-contract:identifier:${name}`],
      match: "pattern" as const,
    })),
  ];
}

/**
 * Which surface the caller is about to sweep.
 *
 * `rendered` is a page a user reads, so it carries the user-language contract's vocabulary and
 * identifier shapes as well as the fixture strings. `projection` is the server payload behind that
 * page, which legitimately holds closed enums such as `setup_required` and `not_connected`: those
 * are the state model's own names, they gate what the page renders, and no user ever sees them. The
 * contract governs what is read, not what is computed, so the vocabulary entries are left out
 * there and the fixture sweep alone applies.
 */
export type ReviewSweepScope = "rendered" | "projection";

/**
 * A fixture value is forbidden unless at least one of the paths that produce it is allowed, and on
 * a rendered surface every user-language contract entry is forbidden unconditionally. The fixture
 * sweep matches by substring, so a value that legitimately renders from an allowed path cannot also
 * be reported as a leak from an unallowed one.
 */
export function forbiddenReviewStrings(
  fixture: unknown,
  allowances: readonly ReviewSurfaceAllowance[],
  scope: ReviewSweepScope = "rendered",
): readonly ForbiddenReviewString[] {
  const byValue = new Map<string, { paths: Set<string>; allowed: boolean }>();

  for (const candidate of collectFixtureStrings(fixture)) {
    const entry = byValue.get(candidate.value) ?? { paths: new Set<string>(), allowed: false };
    entry.paths.add(candidate.path);
    entry.allowed ||= allowances.some((allowance) => allows(allowance, candidate));
    byValue.set(candidate.value, entry);
  }

  return [
    ...[...byValue.entries()]
      .filter(([, entry]) => !entry.allowed)
      .map(([value, entry]) => ({ value, paths: [...entry.paths].sort() }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    ...(scope === "rendered" ? userLanguageForbiddenStrings() : []),
  ];
}

/**
 * Allowances that no longer match anything in the fixture. Reported so a renamed or removed field
 * cannot leave a stale tolerance behind that silently widens the next sweep.
 */
export function staleAllowances(
  fixture: unknown,
  allowances: readonly ReviewSurfaceAllowance[],
): readonly string[] {
  const collected = collectFixtureStrings(fixture);

  return allowances
    .filter((allowance) => !collected.some((candidate) => allows(allowance, candidate)))
    .map((allowance) =>
      allowance.value === undefined
        ? allowance.path
        : `${allowance.path} = ${JSON.stringify(allowance.value)}`,
    );
}

/**
 * The readable surface of a rendered review route: visible text, accessible attributes, the text of
 * every `aria-describedby` target, and every `<code>` value, minus the collapsed support region.
 *
 * `aria-describedby` targets are resolved against the owning document rather than the container,
 * because a description can live outside the rendered subtree and a screen reader still reads it.
 */
export function reviewSurfaceText(container: HTMLElement): string {
  const readable = container.cloneNode(true) as HTMLElement;
  for (const supportRegion of readable.querySelectorAll(SUPPORT_DETAILS_SELECTOR)) {
    supportRegion.remove();
  }

  const fragments = [readable.textContent ?? ""];

  for (const element of readable.querySelectorAll("code")) {
    fragments.push(element.textContent ?? "");
  }

  for (const element of readable.querySelectorAll("*")) {
    for (const attribute of inspectedAttributes) {
      const value = element.getAttribute(attribute);
      if (value !== null && value.length > 0) {
        fragments.push(value);
      }
    }

    const describedBy = element.getAttribute("aria-describedby");
    if (describedBy === null) {
      continue;
    }
    for (const id of describedBy.split(/\s+/u).filter((token) => token.length > 0)) {
      const target = container.ownerDocument.getElementById(id);
      if (target !== null && target.closest(SUPPORT_DETAILS_SELECTOR) === null) {
        fragments.push(target.textContent ?? "");
      }
    }
  }

  return fragments.join("\n");
}

function matchesSurface(surface: string, entry: ForbiddenReviewString): boolean {
  switch (entry.match ?? "substring") {
    case "substring":
      return surface.includes(entry.value);
    case "word":
      return forbiddenTermPattern(entry.value).test(surface);
    case "pattern":
      return new RegExp(entry.value, "iu").test(surface);
  }
}

export function leakedReviewStrings(
  surface: string,
  forbidden: readonly ForbiddenReviewString[],
): readonly string[] {
  return forbidden
    .filter((entry) => matchesSurface(surface, entry))
    .map((entry) => `${entry.paths.join(" | ")} = ${JSON.stringify(entry.value)}`);
}
