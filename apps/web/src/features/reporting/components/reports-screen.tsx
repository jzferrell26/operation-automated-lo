import { Card, Stack } from "@oalo/ui";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import { loadReportingAcceptanceProjection } from "../model/reporting-acceptance.js";
import type { SyntheticReporting } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";
import { SampleDataNotice } from "./sample-data-notice.js";
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
          <p className={styles.eyebrow}>Reports</p>
          <h1>{reporting.portfolio.title}</h1>
          <p>
            This page shows what an agency sign-in can see. Your own sign-in does not gain agency
            access from opening it.
          </p>
        </div>
      </header>

      <SampleDataNotice disclosure={reporting.safety.disclosure} />

      <ReportingAcceptanceSurface projection={acceptanceProjection} />

      <section aria-labelledby="portfolio-totals-title" className={styles.portfolio}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="portfolio-totals-title">Across the workspaces you can see</h2>
            <p>{reporting.portfolio.source}</p>
          </div>
          <span>{reporting.portfolio.freshness}</span>
        </div>
        <div className={styles.metricGrid}>
          <Card padding="sm">
            <strong>{reporting.portfolio.authorizedLocationCount}</strong>
            <span>Workspaces</span>
          </Card>
          <Card padding="sm">
            <strong>{reporting.portfolio.totalCampaigns}</strong>
            <span>Campaigns</span>
          </Card>
          <Card padding="sm">
            <strong>{reporting.portfolio.totalExceptions}</strong>
            <span>Things that went wrong</span>
          </Card>
        </div>
      </section>

      <section aria-labelledby="portfolio-access-title" className={styles.portfolio}>
        <h2 id="portfolio-access-title">Which workspaces you can see</h2>
        <Stack gap="3">
          {reporting.portfolio.locations.map((location, index) =>
            location.state === "authorized" ? (
              <Card data-location-state="authorized" key={location.id} padding="md">
                <div className={styles.sectionHeading}>
                  <div>
                    <h3>{location.displayName}</h3>
                    <p>{location.authorizationSource}</p>
                  </div>
                  <span>You can see this one</span>
                </div>
                <p>
                  {location.campaigns} campaigns, {location.exceptions} things that went wrong
                </p>
                <div className={styles.inlineLinks}>
                  <a className="oalo-action-link" href={location.campaignHref}>
                    Open the campaign
                  </a>
                  <a className="oalo-action-link" href={location.exceptionHref}>
                    See what went wrong
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
        <h2 id="authorized-exceptions-title">What went wrong</h2>
        <Card padding="md">
          <p>
            Two examples are shown for the one workspace you can see. Nothing from a workspace you
            cannot see appears here.
          </p>
        </Card>
      </section>

      <SupportTimeEntry supportEntry={reporting.supportEntry} />
    </div>
  );
}
