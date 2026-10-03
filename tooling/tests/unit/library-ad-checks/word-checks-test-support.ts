import { evaluateLibraryAdWords, type LibraryAdTextField, type LibraryAdTexts } from "@oalo/domain";

/**
 * PRD-009d D5. A clean set of the texts a library ad prints or carries, so a table can change one
 * field and read which rules that one change trips. The values are the repository's own sample
 * identity (`apps/web/src/features/brand/model/synthetic-brand-profile.ts`), never a real licensee.
 */
export const CLEAN_TEXTS: LibraryAdTexts = Object.freeze({
  headline: "Thinking about your first home? Start here.",
  primaryText:
    "I walk first-time buyers through each step, from pre-approval to closing day. Send me a message and let's talk about your plans.",
  name: "Alex Morgan",
  title: "Loan officer",
  company: "Prairie Home Lending",
  disclosureLine: "Equal Housing Opportunity.",
  leadFormWording:
    "By submitting, you agree to be contacted about home financing and related mortgage services.",
});

/** The rule codes one field's value trips, with every other text clean. */
export function codesFor(
  field: LibraryAdTextField,
  value: string,
  partnerNames: readonly string[] = [],
): readonly string[] {
  return evaluateLibraryAdWords({ ...CLEAN_TEXTS, [field]: value }, partnerNames).map(
    (finding) => finding.ruleCode,
  );
}

/** The findings one field's value trips, with every other text clean. */
export function findingsFor(
  field: LibraryAdTextField,
  value: string,
  partnerNames: readonly string[] = [],
) {
  return evaluateLibraryAdWords({ ...CLEAN_TEXTS, [field]: value }, partnerNames);
}
