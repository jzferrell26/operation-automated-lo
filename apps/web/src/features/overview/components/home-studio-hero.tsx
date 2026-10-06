import { Icon, Link } from "@oalo/ui";

import { CAMPAIGN_STUDIO as COPY } from "../../../copy/campaign-studio-messages.js";
import styles from "./home-studio.module.css";

/** Original decorative composition, not a fake campaign preview or image-upload promise. */
function PackageIllustration() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.backSheet} />
      <div className={styles.paper}>
        <div className={styles.paperTop}>
          <Icon decorative name="file-text" />
          <span>{COPY.draft}</span>
        </div>
        <div className={styles.paperBody}>
          <span className={styles.documentMark}>
            <Icon decorative name="home" size="lg" />
          </span>
          <strong className={styles.paperTitle}>{COPY.paperTitle}</strong>
          <p className={styles.paperSubtitle}>{COPY.paperSubtitle}</p>
          <div className={styles.lines}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.team}>
            <span>
              <Icon decorative name="users" size="sm" />
              {COPY.identityOne}
            </span>
            <span>
              <Icon decorative name="users" size="sm" />
              {COPY.identityTwo}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.outputRail}>
        {COPY.outputs.map((output) => (
          <span key={output.label}>
            <Icon decorative name={output.icon} size="sm" />
            {output.label}
          </span>
        ))}
      </div>
      <p className={styles.visualCaption}>{COPY.illustrationLabel}</p>
    </div>
  );
}

export function HomeStudioHero({ canCreate }: Readonly<{ canCreate: boolean }>) {
  return (
    <section className={styles.hero} aria-labelledby="campaign-studio-title" data-home="studio">
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <Icon decorative name="layers" size="sm" />
          {COPY.eyebrow}
        </p>
        <h1 className={styles.title} data-studio-title="" id="campaign-studio-title">
          {COPY.title}
        </h1>
        <p className={styles.description}>{COPY.description}</p>
        <div className={styles.actions}>
          <Link
            variant="action"
            className={styles.primary}
            data-home-primary=""
            href={canCreate ? COPY.propertyPath : COPY.campaignPath}
          >
            {canCreate ? COPY.create : COPY.browse}
            <Icon decorative name="arrow-right" size="sm" />
          </Link>
          {canCreate ? (
            <Link variant="sentence" href={COPY.campaignPath}>
              {COPY.browse}
            </Link>
          ) : null}
        </div>
        <p className={styles.boundary}>
          <Icon decorative name="lock" size="sm" />
          {canCreate ? COPY.boundary : COPY.roles}
        </p>
      </div>
      <PackageIllustration />
    </section>
  );
}
