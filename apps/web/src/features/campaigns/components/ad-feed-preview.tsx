import type { AdsLibraryCallToAction } from "@oalo/contracts";

import { SPONSORED } from "../../../copy/launch-messages.js";
import { brandInitials } from "../../workspace/ad-brand.js";
import { CALL_TO_ACTION_LABELS, type LaunchBand } from "../launch-model.js";
import { AdCreative, adColorVariables, type AdShape } from "./ad-creative.js";
import styles from "./ad-creative.module.css";

export type AdFeedPreviewProps = Readonly<{
  art: Readonly<{ tall: string; square: string }>;
  alt: string;
  shape: AdShape;
  advertiser: LaunchBand;
  sample: boolean;
  headline: string;
  primaryText: string;
  callToAction: AdsLibraryCallToAction;
}>;

/**
 * PRD-009d 009D-AC-009 and 009D-AC-013. The actual ad in a generic feed frame: the post header, the
 * primary text, the ad itself, and the headline with the ad's button. The frame carries no Meta logo
 * and no Meta branding, and the caption beside it never claims to match Facebook exactly. Until Meta
 * is connected the header names the person's own Brand (design section 5.4).
 *
 * The words and every Brand value are React text children; nothing here renders markup from them.
 */
export function AdFeedPreview({
  art,
  alt,
  shape,
  advertiser,
  sample,
  headline,
  primaryText,
  callToAction,
}: AdFeedPreviewProps) {
  const poster = [advertiser.name.trim(), advertiser.company.trim()]
    .filter((part) => part !== "")
    .join(", ");
  return (
    <article
      className={styles.feed}
      data-ad-feed-preview=""
      style={adColorVariables(advertiser.colorPresetId)}
    >
      <div className={styles.feedHeader}>
        <span aria-hidden="true" className={styles.avatar}>
          {brandInitials(advertiser.name)}
        </span>
        <span>
          <span className={styles.feedName}>{poster}</span>
          <br />
          <span className={styles.feedSponsored}>{SPONSORED}</span>
        </span>
      </div>
      <p className={styles.feedText}>{primaryText}</p>
      <AdCreative advertiser={advertiser} alt={alt} art={art} sample={sample} shape={shape} />
      <div className={styles.feedFooter}>
        <span>
          <span className={styles.feedCompany}>{advertiser.company}</span>
          <p className={styles.feedHeadline}>{headline}</p>
        </span>
        <span aria-hidden="true" className={styles.feedButton}>
          {CALL_TO_ACTION_LABELS[callToAction]}
        </span>
      </div>
    </article>
  );
}
