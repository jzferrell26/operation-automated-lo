import { SUPPORT_DETAILS_SUMMARY } from "../../../copy/user-language.js";

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
