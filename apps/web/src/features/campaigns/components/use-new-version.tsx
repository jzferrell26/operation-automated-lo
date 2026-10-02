"use client";

import { Button } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useState } from "react";

import { USE_NEW_VERSION, NOTICES } from "../../../copy/campaign-page-messages.js";
import { SAVE_FAILED } from "../../../copy/launch-messages.js";
import { postInternalJson, refusalFrom, UNREACHED_REFUSAL } from "../../http/internal-api.js";
import { userMessageSentence } from "../../http/user-messages.js";
import type { UseNewVersionRequest } from "../campaign-page-model.js";
import { reviewHref } from "../launch-model.js";
import styles from "./campaign-page.module.css";

/**
 * PRD-009c D4 and 009C-AC-009. "Use the new version", for a version nobody has approved whose
 * library ad has a newer version.
 *
 * It asks first, because it replaces the person's headline and ad text with the new version's
 * words. Then it saves a new version of the same campaign through the one save route "Launch an ad"
 * uses, carrying the new version's own words and the budget, dates, and area the campaign already
 * has, and opens step 3 for it. The approved version of a campaign never changes its library ad
 * version: this button is never offered for one.
 */
export function UseNewVersion({ request }: Readonly<{ request: UseNewVersionRequest }>) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function save(): Promise<void> {
    setBusy(true);
    setStatus("");
    try {
      const response = await postInternalJson("/api/campaigns/preflight", {
        adId: request.adId,
        adVersion: request.adVersion,
        campaignRef: request.campaignRef,
        headline: request.headline,
        primaryText: request.primaryText,
        endsOn: request.endsOn,
        dailyBudgetDollars: request.dailyBudgetDollars,
        totalBudgetDollars: request.totalBudgetDollars,
        places: request.places,
      });
      if (!response.ok) {
        const refusal = await refusalFrom(response);
        setStatus(`${SAVE_FAILED} ${userMessageSentence(refusal.code)}`);
        return;
      }
      router.push(reviewHref(request.campaignRef, "campaigns"));
    } catch {
      setStatus(`${SAVE_FAILED} ${userMessageSentence(UNREACHED_REFUSAL.code)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <Button
        onClick={() => {
          setAsking(true);
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {NOTICES.useNewVersion}
      </Button>
    );
  }
  return (
    <div className={styles.older} data-use-new-version="">
      <p>{USE_NEW_VERSION.question}</p>
      <div className={styles.noticeActions}>
        <Button
          disabled={busy}
          onClick={() => {
            void save();
          }}
          size="sm"
          type="button"
          variant="primary"
        >
          {busy ? USE_NEW_VERSION.saving : USE_NEW_VERSION.confirm}
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setAsking(false);
            setStatus("");
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {USE_NEW_VERSION.cancel}
        </Button>
      </div>
      <p aria-live="polite" role="status">
        {status}
      </p>
    </div>
  );
}
