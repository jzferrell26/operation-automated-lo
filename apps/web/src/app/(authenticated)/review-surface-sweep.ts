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

export type ForbiddenReviewString = Readonly<{ value: string; paths: readonly string[] }>;

/**
 * Every attribute a reviewer can read without opening devtools. Class names and `data-*` hooks are
 * deliberately excluded: they are implementation handles, not statements about the workspace.
 */
const inspectedAttributes = ["alt", "aria-label", "href", "placeholder", "title"] as const;

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
 * A value is forbidden unless at least one of the paths that produce it is allowed. The sweep
 * matches by substring, so a value that legitimately renders from an allowed path cannot also be
 * reported as a leak from an unallowed one.
 */
export function forbiddenReviewStrings(
  fixture: unknown,
  allowances: readonly ReviewSurfaceAllowance[],
): readonly ForbiddenReviewString[] {
  const byValue = new Map<string, { paths: Set<string>; allowed: boolean }>();

  for (const candidate of collectFixtureStrings(fixture)) {
    const entry = byValue.get(candidate.value) ?? { paths: new Set<string>(), allowed: false };
    entry.paths.add(candidate.path);
    entry.allowed ||= allowances.some((allowance) => allows(allowance, candidate));
    byValue.set(candidate.value, entry);
  }

  return [...byValue.entries()]
    .filter(([, entry]) => !entry.allowed)
    .map(([value, entry]) => ({ value, paths: [...entry.paths].sort() }))
    .sort((left, right) => left.value.localeCompare(right.value));
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

/** The readable surface of a rendered review route: visible text plus accessible attributes. */
export function reviewSurfaceText(container: HTMLElement): string {
  const fragments = [container.textContent ?? ""];

  for (const element of container.querySelectorAll("*")) {
    for (const attribute of inspectedAttributes) {
      const value = element.getAttribute(attribute);
      if (value !== null && value.length > 0) {
        fragments.push(value);
      }
    }
  }

  return fragments.join("\n");
}

export function leakedReviewStrings(
  surface: string,
  forbidden: readonly ForbiddenReviewString[],
): readonly string[] {
  return forbidden
    .filter((entry) => surface.includes(entry.value))
    .map((entry) => `${entry.paths.join(" | ")} = ${JSON.stringify(entry.value)}`);
}
