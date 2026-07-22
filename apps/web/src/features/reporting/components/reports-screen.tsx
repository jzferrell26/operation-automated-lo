import { Card, Icon, Stack } from "@oalo/ui";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import { loadReportingAcceptanceProjection } from "../model/reporting-acceptance.js";
import type { SyntheticReporting } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";
import { ReportingAcceptanceSurface } from "./reporting-acceptance-surface.js";
import { SupportTimeEntry } from "./support-time-entry.js";

type ReportsScreenProps = Readonly<{
  reporting: DeepReadonly<SyntheticReporting>;
}>;

export function ReportsScreen({ reporting }: ReportsScreenProps) {
  const acceptanceProjection = loadReportingAcceptanceProjection();

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Authorized synthetic projection</p>
          <h1>{reporting.portfolio.title}</h1>
          <p>
            This route demonstrates agency authorization boundaries. It does not grant the current
            loan officer session agency access.
          </p>
        </div>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Synthetic authorization evidence only</strong>
          <p>{reporting.safety.disclosure}</p>
        </div>
      </Card>

      <ReportingAcceptanceSurface projection={acceptanceProjection} />

      <section aria-labelledby="portfolio-totals-title" className={styles.portfolio}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="portfolio-totals-title">Authorized portfolio totals</h2>
            <p>{reporting.portfolio.source}</p>
          </div>
          <span>{reporting.portfolio.freshness}</span>
        </div>
        <div className={styles.metricGrid}>
          <Card padding="sm">
            <strong>{reporting.portfolio.authorizedLocationCount}</strong>
            <span>Authorized locations</span>
          </Card>
          <Card padding="sm">
            <strong>{reporting.portfolio.totalCampaigns}</strong>
            <span>Campaigns</span>
          </Card>
          <Card padding="sm">
            <strong>{reporting.portfolio.totalExceptions}</strong>
            <span>Exceptions</span>
          </Card>
        </div>
      </section>

      <section aria-labelledby="portfolio-access-title" className={styles.portfolio}>
        <h2 id="portfolio-access-title">Location access</h2>
        <Stack gap="3">
          {reporting.portfolio.locations.map((location, index) =>
            location.state === "authorized" ? (
              <Card data-location-state="authorized" key={location.id} padding="md">
                <div className={styles.sectionHeading}>
                  <div>
                    <h3>{location.displayName}</h3>
                    <p>{location.authorizationSource}</p>
                  </div>
                  <span>Authorized</span>
                </div>
                <p>
                  {location.campaigns} campaigns, {location.exceptions} exceptions
                </p>
                <div className={styles.inlineLinks}>
                  <a className="oalo-action-link" href={location.campaignHref}>
                    Open campaign detail
                  </a>
                  <a className="oalo-action-link" href={location.exceptionHref}>
                    Review authorized exceptions
                  </a>
                </div>
              </Card>
            ) : (
              <Card
                data-location-state="restricted"
                key={`${location.state}-${index}`}
                padding="md"
              >
                <h3>{location.label}</h3>
                <p>{location.reason}</p>
              </Card>
            ),
          )}
        </Stack>
      </section>

      <section aria-labelledby="authorized-exceptions-title" id="authorized-exceptions">
        <h2 id="authorized-exceptions-title">Authorized exceptions</h2>
        <Card padding="md">
          <p>
            Two synthetic exceptions are available for the explicitly authorized location. No
            restricted location details are rendered.
          </p>
        </Card>
      </section>

      <SupportTimeEntry supportEntry={reporting.supportEntry} />
    </div>
  );
}
