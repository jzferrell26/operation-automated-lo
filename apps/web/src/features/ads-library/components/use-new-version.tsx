"use client";

import { LiveRegion, SafeAction, type SafeActionDecision } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useState } from "react";

import {
  NEWER_VERSION_NOTICE,
  USE_NEW_VERSION,
  USE_NEW_VERSION_CONFIRM,
  USE_NEW_VERSION_CONFIRMATION,
  USE_NEW_VERSION_EXPLANATION,
  USE_NEW_VERSION_FAILED,
  USE_NEW_VERSION_SAVED_NOTHING,
  USE_NEW_VERSION_SAVING,
  USE_NEW_VERSION_WHO,
} from "../../../copy/ads-library-messages.js";
import { reviewHref } from "../../campaigns/launch-model.js";
import {
  postInternalJson,
  refusalFrom,
  UNREACHED_REFUSAL,
  type InternalRefusal,
} from "../../http/internal-api.js";
import { userMessageSentence } from "../../http/user-messages.js";
import { SupportReference } from "../../shell/components/support-details.js";
import { newVersionRequest, type NewerVersionOffer } from "../newer-version.js";
import styles from "./use-new-version.module.css";

/**
 * PRD-009c D4 and 009C-AC-009, 009E-AC-006. "A newer version of this ad is in the library." and the
 * action that takes it, for the campaign page (009e) to mount.
 *
 * The notice is for every campaign version of an older library ad version. The action is only for
 * a version nobody has decided on, and only for a person who can save a campaign version
 * (`canUse`). It asks first, because it replaces the person's words: the confirm step says what is
 * replaced and what is kept, and nothing is sent until the person says yes. Then it saves a new
 * campaign version on the newer ad version through the same route "Save and check" uses, which
 * appends version N+1 to this campaign and leaves every earlier version, and every decision made
 * on one, exactly as it was. The new version opens for review with its own checks.
 *
 * The offer is built on the server (`newerVersionOffer`) from the catalog and the saved version; it
 * carries display and carry-over values only.
 *
 * Step 3 of "Launch an ad" mounts it too, in place of Approve (writing review delta check, D-3). It
 * passes its own `lead`, which says why the version can't be approved, and `askWhenCannot`, which
 * tells somebody who can't save a version who can. The campaign page passes `askWhenCannot` too, the
 * same sentence (quality close-out, QA-12), and no `lead`, so the notice 009C-AC-009 fixes is
 * unchanged there.
 */

export type UseNewVersionProps = Readonly<{
  offer: NewerVersionOffer;
  /** Whether the viewer may save a campaign version: a workspace owner or a campaign creator. */
  canUse: boolean;
  /** The line the notice says. It is `NEWER_VERSION_NOTICE` unless the screen has more to say. */
  lead?: string | undefined;
  /**
   * What to say under the lead to somebody who can't save a version, for a screen where the person
   * came to approve and would otherwise be left with no one to ask. Said only for a version nobody
   * has decided on, since a decided version has nothing left to move.
   */
  askWhenCannot?: string | undefined;
}>;

export function UseNewVersion({
  offer,
  canUse,
  lead = NEWER_VERSION_NOTICE,
  askWhenCannot,
}: UseNewVersionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // The sentence, and the whole refusal behind it, so the support reference a sentence points at
  // is drawn under it (writing review pass 2, W-27).
  const [problem, setProblem] = useState<
    Readonly<{ sentence: string; refusal: InternalRefusal }> | undefined
  >(undefined);
  const offered = offer.undecided && canUse;

  async function save() {
    setBusy(true);
    setProblem(undefined);
    try {
      const response = await postInternalJson("/api/campaigns/preflight", newVersionRequest(offer));
      if (!response.ok) {
        const refusal = await refusalFrom(response);
        setProblem({
          sentence: `${USE_NEW_VERSION_FAILED} ${userMessageSentence(refusal.code)}`,
          refusal,
        });
        return;
      }
      const saved = (await response.json()) as { campaignRef: string };
      router.push(reviewHref(saved.campaignRef));
    } catch {
      setProblem({
        sentence: `${USE_NEW_VERSION_FAILED} ${userMessageSentence(UNREACHED_REFUSAL.code)}`,
        refusal: UNREACHED_REFUSAL,
      });
    } finally {
      setBusy(false);
    }
  }

  const decision: SafeActionDecision = busy
    ? {
        state: "loading",
        explanation: USE_NEW_VERSION_EXPLANATION,
        requiredRole: USE_NEW_VERSION_WHO,
        lastSafeState: USE_NEW_VERSION_SAVED_NOTHING,
        progressLabel: USE_NEW_VERSION_SAVING,
      }
    : {
        state: "ready",
        explanation: USE_NEW_VERSION_EXPLANATION,
        requiredRole: USE_NEW_VERSION_WHO,
        confirmation: USE_NEW_VERSION_CONFIRMATION,
      };

  return (
    <div className={styles.notice} data-newer-version="">
      <p className={styles.line}>{lead}</p>
      {askWhenCannot !== undefined && offer.undecided && !canUse ? (
        <p className={styles.line} data-newer-version-ask="">
          {askWhenCannot}
        </p>
      ) : null}
      {offered ? (
        <SafeAction
          confirmLabel={USE_NEW_VERSION_CONFIRM}
          decision={decision}
          label={USE_NEW_VERSION}
          onConfirm={save}
          variant="secondary"
        />
      ) : null}
      {problem === undefined ? null : (
        <>
          <LiveRegion message={problem.sentence} urgency="alert" visible />
          <SupportReference refusal={problem.refusal} />
        </>
      )}
    </div>
  );
}
