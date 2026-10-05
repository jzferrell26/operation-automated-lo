"use client";

import { Badge, Link, Surface } from "@oalo/ui";
import { useState } from "react";
import type { PropertyPackagePanelState } from "./package-model.js";

import { PROPERTY_CAMPAIGN_COPY as COPY } from "../../copy/property-campaign-messages.js";
import type { PropertyPreparationCampaignPage } from "../campaigns/campaign-page-model.js";
import { CampaignVersionsCard } from "../campaigns/components/campaign-versions-card.js";
import layout from "../campaigns/components/launch.module.css";
import styles from "./property-campaign.module.css";
import { PropertyPackagePanel } from "./property-package-panel.js";
import { PROPERTY_PACKAGE_COPY } from "../../copy/property-package-messages.js";

function readableInstant(value: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}

/** Exact saved preparation and private package evidence. No approval or public launch action. */
export function PropertyCampaignScreen({
  page,
}: Readonly<{ page: PropertyPreparationCampaignPage }>) {
  const [packageState, setPackageState] = useState<PropertyPackagePanelState>(
    page.packageState ?? { kind: "unavailable" },
  );
  return (
    <div className={`${layout.page} ${styles.page}`} data-campaign-page="property-preparation">
      <header className={layout.header}>
        <Link href="/marketing/campaigns" variant="sentence">
          {COPY.campaigns}
        </Link>
        <div className={layout.headText}>
          <p className={layout.note}>{COPY.eyebrow}</p>
          <h1>{page.address}</h1>
          <p className={layout.lead}>{COPY.draftIntro}</p>
          <p>
            <Badge tone="neutral">{COPY.saved}</Badge>
          </p>
        </div>
      </header>
      <PropertyPackagePanel
        key={page.campaignVersionRef}
        campaignRef={page.campaignRef}
        campaignVersionRef={page.campaignVersionRef}
        sourceManifestHash={page.sourceManifestHash}
        canGenerate={page.canGeneratePackage}
        state={packageState}
        onGenerated={(summary) => setPackageState({ kind: "ready", summary })}
      />
      <Surface padding="lg">
        <div className={layout.form}>
          <h2 className={layout.cardTitle}>{COPY.propertyTitle}</h2>
          <dl className={styles.facts}>
            <div>
              <dt>{COPY.descriptionLabel}</dt>
              <dd>{page.description}</dd>
            </div>
            <div>
              <dt>{COPY.startsLabel}</dt>
              <dd>
                <time dateTime={page.startsAt}>{readableInstant(page.startsAt)}</time>
              </dd>
            </div>
            <div>
              <dt>{COPY.endsLabel}</dt>
              <dd>
                <time dateTime={page.endsAt}>{readableInstant(page.endsAt)}</time>
              </dd>
            </div>
            <div>
              <dt>{COPY.brandTitle}</dt>
              <dd>
                {page.brandName}, {page.brandCompany}
                <br />
                NMLS {page.nmls} / {page.companyNmls}
              </dd>
            </div>
            <div>
              <dt>{COPY.partnerTitle}</dt>
              <dd>
                {page.partnerName}, {page.partnerCompany}
              </dd>
            </div>
            <div>
              <dt>{COPY.propertyPermission}</dt>
              <dd>
                {page.propertyPermissionConfirmed
                  ? COPY.permissionConfirmed
                  : COPY.permissionMissing}
              </dd>
            </div>
            <div>
              <dt>{COPY.partnerPermission}</dt>
              <dd>
                {page.realtorPermissionConfirmed
                  ? COPY.permissionConfirmed
                  : COPY.permissionMissing}
              </dd>
            </div>
          </dl>
        </div>
      </Surface>
      <Surface padding="lg">
        <div className={layout.form}>
          <div>
            <h2 className={layout.cardTitle}>{COPY.materialsTitle}</h2>
            <p>{COPY.materialsIntro}</p>
          </div>
          <ol className={styles.package}>
            {COPY.stages.map((stage, index) => (
              <li
                key={stage.title}
                data-property-package-stage={index === 1 ? "materials" : undefined}
              >
                <div>
                  <strong>{stage.title}</strong>
                  <Badge tone="neutral">
                    {index === 1 && packageState.kind === "ready"
                      ? PROPERTY_PACKAGE_COPY.materialsStage
                      : stage.status}
                  </Badge>
                </div>
                <p className={layout.note}>
                  {index === 1 && packageState.kind === "ready"
                    ? PROPERTY_PACKAGE_COPY.materialsDetail
                    : stage.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Surface>
      <CampaignVersionsCard shownVersionNo={page.versionNo} versions={page.versions} />
    </div>
  );
}
