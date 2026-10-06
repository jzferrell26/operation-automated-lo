import { Link } from "@oalo/ui";
import type { AdsLibraryTopic } from "@oalo/contracts";

import {
  HOME_PATHS,
  HOME_START,
  HOME_TOPIC_LABELS,
  homeTopicHref,
} from "../../../copy/home-messages.js";
import styles from "./overview.module.css";

/**
 * PRD-009b, as amended by UX-001 on October 6. "Launch an ad" is a supporting h2 below the studio.
 * The ad flow retains its lead, topic choices, and steps. Its link is secondary to property creation.
 * Historically this card held the page's h1, then the lead, the
 * question, one secondary button per topic that has an active ad, the one primary button, and the
 * three step labels. With no active ad the sentence of 009C-AC-012 stands in place of the question
 * and the topic buttons, and "Choose an ad" still opens step 1, which says the same.
 *
 * Focus order (009B-AC-003). "Choose an ad" comes first in the document and the topic buttons after
 * it, so it is the first control after the skip link and the top bar. The design draws the topics
 * above the button, so the two are laid out in the order the mockup shows and the stylesheet puts
 * them there; the document order is the one a keyboard and a screen reader follow.
 */
export function HomeStartCard({ topics }: Readonly<{ topics: readonly AdsLibraryTopic[] }>) {
  return (
    <section aria-labelledby="home-start-title" className={styles.start} data-home="start">
      <p className={styles.eyebrow}>{HOME_START.eyebrow}</p>
      <h2 className={styles.startTitle} id="home-start-title">
        {HOME_START.heading}
      </h2>
      <p className={styles.lead}>{HOME_START.lead}</p>

      <div className={styles.startActions}>
        <div className={styles.primaryRow}>
          <Link className={styles.adChoice} href={HOME_PATHS.launch} variant="action">
            {HOME_START.primaryAction}
          </Link>
        </div>
        {topics.length === 0 ? (
          <p className={styles.emptyLibrary}>{HOME_START.emptyLibrary}</p>
        ) : (
          <div className={styles.topics}>
            <p className={styles.question} id="home-topic-question">
              {HOME_START.question}
            </p>
            <ul aria-labelledby="home-topic-question" className={styles.chips}>
              {topics.map((topic) => (
                <li key={topic}>
                  <Link className={styles.chip} href={homeTopicHref(topic)} variant="action">
                    {HOME_TOPIC_LABELS[topic]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ol aria-label={HOME_START.stepsLabel} className={styles.steps}>
        {HOME_START.steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true" className={styles.stepDot}>
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
