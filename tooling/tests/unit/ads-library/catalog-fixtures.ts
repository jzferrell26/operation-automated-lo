/**
 * Catalog entries for the PRD-009c schema tests. Every builder returns a fresh object, so a test
 * can mutate one field of it and know that the field is the only thing wrong.
 */

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);

export type MutableEntry = Record<string, unknown> & {
  id: string;
  version: number;
  status: string;
  sample: boolean;
  topic: string;
  name: string;
  images: {
    tall: { art: string; sha256: string };
    square: { art: string; sha256: string };
    alt: string;
  };
  defaults: { headline: string; primaryText: string };
  editable: { headline: { maxLength: number }; primaryText: { maxLength: number } };
  callToAction: string;
  specialAdCategory: string;
  compliance: { notes: string; requiredOnAd: string[]; blockedInWords: string[] };
  approval: { approvedBy: string; approvedOn: string };
  retired?: { on: string; reason: string; replacedBy: string | null };
};

export function realEntry(
  id = "first-home-start-here",
  version = 1,
  status: "active" | "retired" | "replaced" = "active",
): MutableEntry {
  return {
    id,
    version,
    status,
    sample: false,
    topic: "first-time-buyers",
    name: "First home, start here",
    images: {
      tall: { art: `${id}/v${String(version)}/tall.png`, sha256: DIGEST_A },
      square: { art: `${id}/v${String(version)}/square.png`, sha256: DIGEST_B },
      alt: "Your first home starts here, with a house and a key",
    },
    defaults: {
      headline: "Buying your first home? Start with a plan.",
      primaryText:
        "I help first-time buyers understand every step, from pre-approval to closing day.",
    },
    editable: { headline: { maxLength: 60 }, primaryText: { maxLength: 300 } },
    callToAction: "LEARN_MORE",
    specialAdCategory: "HOUSING",
    compliance: {
      notes: "No rates, payments or loan terms.",
      requiredOnAd: ["nmls", "equal-housing"],
      blockedInWords: ["rate-claims", "payment-claims", "term-claims"],
    },
    approval: { approvedBy: "jzferrell26", approvedOn: "2026-10-01" },
    ...(status === "retired"
      ? { retired: { on: "2026-10-02", reason: "Taken out of the library.", replacedBy: null } }
      : {}),
  };
}

export function sampleEntry(
  id = "sample-first-home",
  version = 1,
  status: "active" | "retired" | "replaced" = "active",
): MutableEntry {
  const entry = realEntry(id, version, status);
  return {
    ...entry,
    sample: true,
    name: "Sample: First home, start here",
    approval: { approvedBy: "Sample catalog, not a real approval", approvedOn: "2026-10-01" },
  };
}
