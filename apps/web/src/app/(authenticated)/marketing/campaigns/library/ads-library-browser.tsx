"use client";

import type { AdsLibraryTopic } from "@oalo/contracts";
import { Button, Link } from "@oalo/ui";
import { useState } from "react";

import {
  adsShownStatus,
  useThisAdSuffix,
} from "../../../../../copy/ads-library-messages.js";
import { TOPIC_LABELS, USE_THIS_AD } from "../../../../../copy/launch-messages.js";
import chips from "../../../../../features/campaigns/components/ad-library-cards.module.css";
import {
  AdCardGrid,
  TopicChipContent,
  TopicChips,
} from "../../../../../features/campaigns/components/ad-library-cards.js";
import { ADS_LIBRARY_PATH } from "../../../../../features/campaigns/components/campaigns-tabs.js";
import {
  launchHref,
  type LaunchAdCard,
  type LaunchBand,
} from "../../../../../features/campaigns/launch-model.js";
import styles from "./ads-library.module.css";

/**
 * PRD-009c part 2, 009C-AC-010 and 009C-AC-011. The topic chips and the card grid of the "Ads
 * library" tab, using the chips, card, and grid 009d builds for step 1.
 *
 * The page opens filtered by `?topic=`. A chip filters in place: the grid narrows, the address follows
 * (`replaceState`, so Back still leaves the page and a reload or a shared address shows the same
 * ads), and nothing reloads. The chips are the same pressed-state buttons step 1 of "Launch an ad"
 * draws, so the two screens filter the same way. The cards arrive as display fields only
 * (009C-AC-013).
 */

export type AdsLibraryBrowserProps = Readonly<{
  cards: readonly LaunchAdCard[];
  advertiser: LaunchBand;
  initialTopic: AdsLibraryTopic | undefined;
}>;

function libraryHref(topic: AdsLibraryTopic | undefined): string {
  return topic === undefined ? ADS_LIBRARY_PATH : `${ADS_LIBRARY_PATH}?topic=${topic}`;
}

export function AdsLibraryBrowser({ cards, advertiser, initialTopic }: AdsLibraryBrowserProps) {
  const [topic, setTopic] = useState<AdsLibraryTopic | undefined>(initialTopic);
  const shown =
    topic === undefined ? cards.length : cards.filter((card) => card.topic === topic).length;

  function choose(next: AdsLibraryTopic | undefined) {
    setTopic(next);
    window.history.replaceState(null, "", libraryHref(next));
  }

  return (
    <div className={styles.browser}>
      <TopicChips
        cards={cards}
        renderChip={({ topic: chipTopic, label, count, selected }) => (
          <Button
            aria-pressed={selected}
            className={chips.chip}
            onClick={() => choose(chipTopic)}
            variant="outline"
          >
            <TopicChipContent count={count} label={label} />
          </Button>
        )}
        selected={topic}
      />
      <p className="oalo-visually-hidden" role="status">
        {adsShownStatus(shown, topic === undefined ? undefined : TOPIC_LABELS[topic])}
      </p>
      <AdCardGrid
        actionFor={(card) => (
          <Link href={launchHref({ step: 2, ad: card.id, from: "library" })} variant="action">
            {USE_THIS_AD}
            <span className="oalo-visually-hidden">{useThisAdSuffix(card.name)}</span>
          </Link>
        )}
        advertiser={advertiser}
        cards={cards}
        topic={topic}
      />
    </div>
  );
}
