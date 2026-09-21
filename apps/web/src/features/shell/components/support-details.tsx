import { SUPPORT_DETAILS_LABELS, SUPPORT_DETAILS_SUMMARY } from "../../../copy/user-language.js";
import type { InternalRefusal } from "../../http/internal-api.js";
import { isMappedErrorCode } from "../../http/user-messages.js";

/** One labelled value: a plain label a user can read aloud, and the value support asks for. */
export type SupportDetailRow = readonly [label: string, value: string];

/**
 * The one place a screen may show a version reference, a fingerprint, a rule code, or a support
 * reference (PRD-006b D8, `library/knowledge/private/standards/user-language-contract.md`
 * section 6).
 *
 * It is collapsed by default, so none of it is part of what a loan officer reads at rest, and it
 * carries `data-support-details` so the rendered-output guard can subtract it before checking that
 * nothing else on the page shows an identifier. Nothing in here is a heading, a name, or inline
 * prose, and nothing in here is a session value, a token, or a hash of one.
 */
export function SupportDetails({ rows }: Readonly<{ rows: readonly SupportDetailRow[] }>) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <details data-support-details>
      <summary>{SUPPORT_DETAILS_SUMMARY}</summary>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="oalo-data-text">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/**
 * The support reference beside a refusal, shown exactly when the code has no sentence of its own.
 *
 * PRD-006b D7. A code the product has words for is answered with those words and nothing else: a
 * person told "This campaign changed since you opened it" has everything they need and a reference
 * would only be clutter. A code the product has no words for is answered with the generic sentence,
 * which asks them to contact support, and support cannot find a request nobody can name. The four
 * surfaces that can show a generic sentence render this, so the rule is written once rather than
 * remembered four times.
 */
export function SupportReference({ refusal }: Readonly<{ refusal: InternalRefusal | undefined }>) {
  if (refusal === undefined || isMappedErrorCode(refusal.code)) {
    return null;
  }

  return (
    <SupportDetails rows={[[SUPPORT_DETAILS_LABELS.supportReference, refusal.supportReference]]} />
  );
}
