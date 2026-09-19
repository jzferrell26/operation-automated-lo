import { notFound } from "next/navigation.js";

import { Card } from "@oalo/ui";

import { REVIEW_SURFACE_DISCLOSURE } from "../../../server/authenticated-workspace-data.js";
import {
  REVIEW_PERSONAS,
  assertReviewSessionSurface,
} from "../../../server/review-session-handler.js";

export const dynamic = "force-dynamic";

/**
 * PRD-005b D4 and 005B-AC-011, 014, 019.
 *
 * A server-rendered form, reachable only in review mode, linked from nothing. It offers a persona
 * name from a closed set and the operator's secret. It does not offer a location, a user, a role,
 * an installation, or a role version, because the browser does not get to choose any of those: the
 * server maps the persona through its own environment and the database.
 */

const PERSONA_LABELS: Readonly<Record<(typeof REVIEW_PERSONAS)[number], string>> = Object.freeze({
  creator: "Campaign creator on the review location",
  approver: "Campaign approver on the review location",
  outsider: "Location administrator on a second location (for cross-tenant refusal)",
});

/**
 * 005B-AC-019. Stated on the page itself, not only in the sub-PRD, because the page is what a
 * reviewer sees. Nothing here is HighLevel SSO, and nothing here flips a deferred criterion.
 */
export const REVIEW_SIGN_IN_SCOPE_STATEMENT =
  "This is not HighLevel SSO. It is an operator-authorized review sign-in that exists only on the review surface, and it satisfies no deferred G2 criterion.";

export default function ReviewSignInPage() {
  // The page and its route share one surface test, so the form can never render on a deployment
  // whose route would refuse it. Production loses here for the same reason it loses there.
  try {
    assertReviewSessionSurface(process.env);
  } catch {
    notFound();
  }

  return (
    <main>
      <Card>
        <h1>Review sign-in</h1>
        <p role="note">{REVIEW_SURFACE_DISCLOSURE}</p>
        <p>{REVIEW_SIGN_IN_SCOPE_STATEMENT}</p>
        <p>
          The session this mints is a real first-party session: it is a row bound to a location, a
          user, a role binding, and an installation; it expires; it can be revoked; and every
          issuance and revocation is audited. What it replaces is the credential exchange, and it
          replaces it with a secret only the operator holds.
        </p>
        <form action="/api/review/session" method="post">
          <fieldset>
            <legend>Persona</legend>
            {REVIEW_PERSONAS.map((persona) => (
              <label htmlFor={`review-persona-${persona}`} key={persona}>
                <input
                  defaultChecked={persona === "creator"}
                  id={`review-persona-${persona}`}
                  name="persona"
                  type="radio"
                  value={persona}
                />
                {PERSONA_LABELS[persona]}
              </label>
            ))}
          </fieldset>
          <label htmlFor="review-sign-in-secret">
            Operator sign-in secret
            <input
              autoComplete="off"
              id="review-sign-in-secret"
              name="secret"
              required
              type="password"
            />
          </label>
          <button type="submit">Start a review session</button>
        </form>
      </Card>
    </main>
  );
}
