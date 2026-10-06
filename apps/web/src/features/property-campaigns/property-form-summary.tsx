import { Icon } from "@oalo/ui";

import { CAMPAIGN_STUDIO, PROPERTY_SUMMARY as COPY } from "../../copy/campaign-studio-messages.js";
import { PROPERTY_CAMPAIGN_COPY } from "../../copy/property-campaign-messages.js";
import styles from "./property-composer.module.css";
import notice from "../../components/campaign-draft-notice.module.css";

/** Read-only mirror of local form state. No persistence, fabricated property image or calculated figure. */
export function PropertyFormSummary({
  address,
  description,
  brandName,
  partner,
}: Readonly<{
  address: string;
  description: string;
  brandName: string;
  partner: Readonly<{ name: string; company: string }> | undefined;
}>) {
  return (
    <aside
      className={styles.summary}
      aria-labelledby="property-summary-title"
      data-property-summary=""
    >
      <div className={styles.summaryHeading}>
        <span className={styles.mark}>
          <Icon decorative name="layers" size="lg" />
        </span>
        <div>
          <p className={styles.kicker}>{COPY.notice}</p>
          <h2 id="property-summary-title">{COPY.title}</h2>
        </div>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.propertyIcon}>
          <Icon decorative name="home" size="lg" />
        </span>
        <h3 data-summary-address="">{address.trim() || COPY.address}</h3>
        <p className={styles.description} data-summary-description="">
          {description.trim() || COPY.description}
        </p>
        <dl className={styles.identities}>
          <div>
            <dt>
              <Icon decorative name="users" size="sm" />
              {PROPERTY_CAMPAIGN_COPY.brandTitle}
            </dt>
            <dd>{brandName || COPY.brand}</dd>
          </div>
          <div>
            <dt>
              <Icon decorative name="users" size="sm" />
              {PROPERTY_CAMPAIGN_COPY.partnerTitle}
            </dt>
            <dd data-summary-partner="">
              {partner === undefined ? COPY.partner : `${partner.name}, ${partner.company}`}
            </dd>
          </div>
        </dl>
      </div>
      <div className={styles.afterSave}>
        <h3>{COPY.outputs}</h3>
        <ul className={styles.outputs}>
          {CAMPAIGN_STUDIO.outputs.map((output) => (
            <li key={output.label}>
              <Icon decorative name={output.icon} size="sm" />
              {output.label}
            </li>
          ))}
        </ul>
        <p>{COPY.outputNote}</p>
      </div>
      <p className={notice.boundary}>
        <Icon decorative name="lock" size="sm" />
        {COPY.boundary}
      </p>
    </aside>
  );
}
