import { adPlaceLabel } from "@oalo/contracts";
import { Surface } from "@oalo/ui";

import { AD_CARD, versionLabel } from "../../../copy/campaign-page-messages.js";
import {
  AD_TEXT_CHANGED,
  AD_TEXT_UNCHANGED,
  FACEBOOK_FEED,
  HEADLINE_CHANGED,
  HEADLINE_UNCHANGED,
  adFact,
} from "../../../copy/launch-messages.js";
import type { LibraryAdCampaignPage } from "../campaign-page-model.js";
import { AdFeedPreview } from "./ad-feed-preview.js";
import styles from "./campaign-page.module.css";

/**
 * PRD-009e 009E-AC-003. The ad of the version being shown: 009d's feed preview and brand band at
 * the tall shape, labelled with the version number, with the library ad's name and version, which
 * words were changed, and who it shows to (the area, then "the Facebook feed").
 *
 * The words and every Brand value reach the page only as React text, by way of the preview. When the
 * library no longer holds the ad its picture cannot be drawn, so the words are shown on their own
 * under a sentence saying why, rather than a frame with a broken image in it.
 */

export function placeLabels(places: LibraryAdCampaignPage["places"]): readonly string[] {
  return [
    ...places.cities.map((value) => adPlaceLabel({ kind: "city", value })),
    ...places.states.map((value) => adPlaceLabel({ kind: "state", value })),
  ];
}

/** "Headline changed. Ad text unchanged." when the library's own words are known, else nothing. */
function wordsLine(page: LibraryAdCampaignPage): string | undefined {
  const defaults = page.ad.defaults;
  if (defaults === undefined) return undefined;
  return [
    defaults.headline === page.words.headline ? HEADLINE_UNCHANGED : HEADLINE_CHANGED,
    defaults.primaryText === page.words.primaryText ? AD_TEXT_UNCHANGED : AD_TEXT_CHANGED,
  ].join(". ");
}

export function CampaignAdCard({ page }: Readonly<{ page: LibraryAdCampaignPage }>) {
  const words = wordsLine(page);
  return (
    <Surface aria-labelledby="campaign-ad-title" data-ad-card="" padding="lg" role="region">
      <div className={styles.body}>
        <div className={styles.cardHead}>
          <h2 id="campaign-ad-title">{AD_CARD.title}</h2>
          <span className={styles.caption}>{versionLabel(page.versionNo)}</span>
        </div>
        <div className={styles.feedFrame} role="group" aria-label={AD_CARD.previewLabel}>
          {page.ad.art === undefined ? (
            <div className={styles.missingPicture}>
              <p className={styles.small}>{AD_CARD.pictureMissing}</p>
              <p>
                <strong>{page.words.headline}</strong>
              </p>
              <p>{page.words.primaryText}</p>
            </div>
          ) : (
            <AdFeedPreview
              advertiser={page.advertiser}
              alt={page.ad.alt}
              art={page.ad.art}
              callToAction={page.ad.callToAction}
              headline={page.words.headline}
              primaryText={page.words.primaryText}
              sample={page.ad.sample}
              shape="tall"
            />
          )}
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{AD_CARD.libraryAd}</dt>
            <dd>{adFact(page.name, page.ad.version)}</dd>
          </div>
          {words === undefined ? null : (
            <div>
              <dt>{AD_CARD.words}</dt>
              <dd>{words}</dd>
            </div>
          )}
          <div>
            <dt>{AD_CARD.shows}</dt>
            <dd>
              <ul className={styles.factList}>
                {placeLabels(page.places).map((label) => (
                  <li key={label}>{label}</li>
                ))}
                <li>{FACEBOOK_FEED}</li>
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </Surface>
  );
}
