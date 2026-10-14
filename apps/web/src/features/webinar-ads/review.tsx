"use client";
import { Badge, Button, Card, Link } from "@oalo/ui";
import { useState } from "react";
import type { WebinarAdCampaignPage } from "../campaigns/campaign-page-model.js";
import { CampaignApprovalControls } from "../campaigns/components/campaign-approval-controls.js";
import { shortDay } from "../campaigns/launch-model.js";
import { webinarMoment, webinarRefusal, WEBINAR_PREPARATION_PATH } from "./preparation-model.js";
import styles from "./preparation.module.css";

export function WebinarAdReviewScreen({ page }: Readonly<{ page: WebinarAdCampaignPage }>) {
  const { review } = page;
  const { manifest } = review;
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState("");
  const approved = page.decision?.decision === "approved";
  const words = [
    manifest.content.headline,
    manifest.content.body,
    manifest.content.callToAction,
    manifest.destination.publicUrl,
    manifest.content.disclosureText,
  ].join("\n\n");
  const newVersionHref = `${WEBINAR_PREPARATION_PATH}?campaign=${encodeURIComponent(page.campaignRef)}&version=${encodeURIComponent(page.campaignVersionRef)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(words);
      setCopied("Saved Facebook words and destination copied.");
    } catch {
      setCopied("Copy is unavailable. Select the saved wording below to copy it manually.");
    }
  }
  return (
    <div className={styles.page} data-campaign-page="webinar-ad" data-version-no={page.versionNo}>
      <Link href="/marketing/campaigns" variant="sentence">
        Campaigns
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Saved webinar ad, version {page.versionNo}</p>
        <h1>{manifest.content.headline}</h1>
        <p>
          Review the exact saved images and placement copy together, then record your decision.
          Approval does not launch an ad or spend money.
        </p>
        <p>
          <Badge tone={approved ? "success" : "warning"}>
            {approved
              ? "Approval recorded"
              : page.decision?.decision === "rejected"
                ? "Sent back for changes"
                : "Awaiting your review"}
          </Badge>
        </p>
      </header>
      {!page.isLatest ? (
        <Card padding="lg">
          <p>You are reading an earlier version. Decisions apply only to the latest version.</p>
          <Link href={page.detailHref}>Open the latest version</Link>
        </Card>
      ) : null}
      {!review.current.available ? (
        <Card padding="lg">
          <h2>Current availability needs attention</h2>
          <p role="alert">
            {review.incompleteSave
              ? "This version was recorded, but saving its checks is unfinished. Return to the original preparation and retry the exact save before approving."
              : webinarRefusal(review.current.error)}
          </p>
          <Link href="/marketing/campaigns/funnels">Open your funnels</Link>
          <Link href="/brand">Open Brand</Link>
        </Card>
      ) : null}
      <div className={styles.columns}>
        <Card padding="lg" className={styles.stack}>
          <h2>Exact saved images</h2>
          <p className={styles.note}>
            These PNGs include the saved lender identity and disclosure. The illustrated lettering
            stays original; edited Facebook wording is shown separately below.
          </p>
          <div className={styles.images}>
            {manifest.images.map((image) => (
              <figure key={image.shape}>
                <img
                  alt={image.altText}
                  className={styles.raster}
                  height={image.height}
                  width={image.width}
                  src={review.art[image.shape]}
                  onError={() => setImageFailed(true)}
                />
                <figcaption>
                  {image.shape === "tall" ? "Tall, 1080 × 1350" : "Square, 1080 × 1080"}
                </figcaption>
                <Link href={review.art[image.shape]} download>
                  Download {image.shape === "tall" ? "tall" : "square"} branded PNG
                </Link>
              </figure>
            ))}
          </div>
          {imageFailed ? (
            <p role="alert">
              A saved image could not be loaded or verified. Retry the page or contact support
              before approving.
            </p>
          ) : null}
          <h2>Facebook placement copy</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Headline</dt>
              <dd>{manifest.content.headline}</dd>
            </div>
            <div>
              <dt>Ad text</dt>
              <dd>{manifest.content.body}</dd>
            </div>
            <div>
              <dt>Call to action</dt>
              <dd>{manifest.content.callToAction}</dd>
            </div>
            <div>
              <dt>Disclosure</dt>
              <dd>{manifest.content.disclosureText}</dd>
            </div>
            <div>
              <dt>Lead form wording</dt>
              <dd>{manifest.content.consentText}</dd>
            </div>
          </dl>
          <Button
            variant="secondary"
            onClick={() => {
              void copy();
            }}
          >
            Copy saved Facebook words
          </Button>
          {copied ? <p role="status">{copied}</p> : null}
          <p className={styles.note}>
            Downloads and copied words carry this version's actual review standing. Your account
            approval does not establish lender authorization or an external creative review.
          </p>
        </Card>
        <div className={styles.stack}>
          <Card padding="lg" className={styles.stack}>
            <h2>Published webinar</h2>
            <p>{review.publication?.title ?? "Saved webinar publication"}</p>
            {review.publication?.learningSummary === null || review.publication === null ? null : (
              <p>{review.publication.learningSummary}</p>
            )}
            <dl className={styles.facts}>
              <div>
                <dt>Format</dt>
                <dd>
                  {manifest.destination.kind === "live-webinar"
                    ? "Live webinar"
                    : "On-demand webinar"}
                </dd>
              </div>
              <div>
                <dt>Exact destination</dt>
                <dd>
                  <Link href={manifest.destination.publicUrl}>
                    {manifest.destination.publicUrl}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Publication expires</dt>
                <dd>
                  <time dateTime={manifest.destination.expiresAt}>
                    {webinarMoment(manifest.destination.expiresAt)}
                  </time>
                </dd>
              </div>
            </dl>
            <p className={styles.note}>
              The webinar publication is separate from optional HighLevel delivery. This review does
              not verify video uptime, registration or conversion.
            </p>
          </Card>
          <Card padding="lg" className={styles.stack}>
            <h2>Budget, dates and places</h2>
            <dl className={styles.facts}>
              <div>
                <dt>Daily budget</dt>
                <dd>{"$" + (manifest.meta.dailyBudgetMinor / 100).toFixed(2)}</dd>
              </div>
              <div>
                <dt>Total limit</dt>
                <dd>{"$" + (manifest.meta.totalBudgetMinor / 100).toFixed(2)}</dd>
              </div>
              <div>
                <dt>Actual stop time</dt>
                <dd>
                  <time dateTime={review.effectiveEndsAt}>
                    {webinarMoment(review.effectiveEndsAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Places</dt>
                <dd>
                  {[...manifest.meta.targeting.regions, ...manifest.meta.targeting.cities].join(
                    "; ",
                  )}
                </dd>
              </div>
            </dl>
            <p className={styles.note}>
              The stop time is capped by the requested end, publication expiry and live webinar
              start. No spend occurs when you save or approve.
            </p>
          </Card>
          <Card padding="lg" className={styles.stack}>
            <h2>Your recorded decision</h2>
            {page.decision === undefined ? (
              <p>You have not recorded a decision on this version.</p>
            ) : (
              <p>
                {page.decision.decision === "approved" ? "Approved" : "Sent back"} by{" "}
                {page.decision.approverDisplayName ?? "the authenticated loan-officer account"} on{" "}
                <time dateTime={page.decision.decidedAt}>{shortDay(page.decision.decidedAt)}</time>.
              </p>
            )}
            <p className={styles.note}>
              Saved <time dateTime={page.savedAt}>{shortDay(page.savedAt)}</time>. The record covers
              these exact saved details.
            </p>
          </Card>
          {page.approvalControls === undefined ||
          !review.current.available ||
          imageFailed ? null : (
            <CampaignApprovalControls {...page.approvalControls} singleAccount />
          )}
          {page.fixes.length === 0 ? null : (
            <Card padding="lg">
              <h2>Changes needed</h2>
              <ul>
                {page.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            </Card>
          )}
          <Card padding="lg" className={styles.stack}>
            <h2>Launch on Facebook</h2>
            <Button disabled>Launch unavailable</Button>
            <p>
              Launching on Facebook is not enabled. Saving or approving this version does not
              publish an ad or spend money.
            </p>
            {page.canMakeNewVersion ? (
              <Link href={newVersionHref}>Prepare a new version</Link>
            ) : null}
          </Card>
          <Card padding="lg" className={styles.stack}>
            <h2>Saved versions</h2>
            <ol>
              {page.versions.map((version) => (
                <li key={version.campaignVersionRef}>
                  {version.versionNo === page.versionNo ? (
                    <strong>Version {version.versionNo}</strong>
                  ) : (
                    <Link href={version.href}>Version {version.versionNo}</Link>
                  )}
                  <p>
                    Saved <time dateTime={version.savedAt}>{shortDay(version.savedAt)}</time>
                    {version.decision === undefined
                      ? ""
                      : version.decision.decision === "approved"
                        ? ", approval recorded"
                        : ", sent back"}
                    .
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
