"use client";

import { Button, Card, Link } from "@oalo/ui";
import { useEffect, useState } from "react";
import {
  loadPublisherStatus,
  PublisherStatusReadError,
  publisherStatusLabel,
  type PublisherStatus,
} from "./publisher-status-model.js";
import { webinarMoment } from "./preparation-model.js";
import styles from "./preparation.module.css";

type Load = Readonly<{ forOperation: string; result?: PublisherStatus; error?: string }>;
const dollars = (minor: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);

/** Explicit refresh only; the provider observation is never replaced by the local read time. */
export function WebinarPublisherStatus({ operationRef }: Readonly<{ operationRef: string }>) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  useEffect(() => {
    let current = true;
    setLoad(null);
    async function read() {
      try {
        const result = await loadPublisherStatus(operationRef);
        if (current) setLoad({ forOperation: operationRef, result });
      } catch (error) {
        if (current)
          setLoad({
            forOperation: operationRef,
            error:
              error instanceof PublisherStatusReadError
                ? error.message
                : "Publishing status could not be verified. Check again or contact support.",
          });
      }
    }
    void read();
    return () => {
      current = false;
    };
  }, [operationRef, attempt]);
  const visible = load?.forOperation === operationRef ? load : null;
  const result = visible?.result;
  return (
    <section className={styles.page} aria-labelledby="publisher-status-title">
      <Link href="/marketing/campaigns">Campaigns</Link>
      <header className={styles.header}>
        <h1 id="publisher-status-title">Webinar ad publishing status</h1>
        <p>Check the saved command and its last recorded provider observation.</p>
      </header>
      <Card padding="lg" className={styles.stack}>
        {visible === null ? <p role="status">Checking publishing status...</p> : null}
        {visible?.error ? <p role="alert">{visible.error}</p> : null}
        {result ? (
          <>
            <h2>{publisherStatusLabel(result.state, result.providerObservedAt)}</h2>
            <p>{result.headline}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Command</dt>
                <dd>{result.action}</dd>
              </div>
              <div>
                <dt>Latest saved campaign standing</dt>
                <dd>{publisherStatusLabel(result.campaignState, null)}</dd>
              </div>
              <div>
                <dt>Provider observation for this command</dt>
                <dd>
                  {result.providerObservedAt === null ? (
                    "No provider observation recorded"
                  ) : (
                    <time dateTime={result.providerObservedAt}>
                      {webinarMoment(result.providerObservedAt)}
                    </time>
                  )}
                </dd>
              </div>
              <div>
                <dt>Status read</dt>
                <dd>
                  <time dateTime={result.checkedAt}>{webinarMoment(result.checkedAt)}</time>
                </dd>
              </div>
              <div>
                <dt>Ad account</dt>
                <dd>{result.accountLabel}</dd>
              </div>
              <div>
                <dt>Facebook page</dt>
                <dd>{result.pageLabel}</dd>
              </div>
              <div>
                <dt>Daily budget</dt>
                <dd>{dollars(result.dailyBudgetMinor)}</dd>
              </div>
              <div>
                <dt>
                  {result.totalSemantics === "hard_cap"
                    ? "Approved total cap"
                    : "Approved total estimate"}
                </dt>
                <dd>{dollars(result.totalBudgetMinor)}</dd>
              </div>
              <div>
                <dt>Scheduled stop</dt>
                <dd>
                  <time dateTime={result.endsAt}>{webinarMoment(result.endsAt)}</time>
                </dd>
              </div>
              <div>
                <dt>Exact webinar destination</dt>
                <dd>
                  <Link href={result.destination}>{result.destination}</Link>
                </dd>
              </div>
            </dl>
            <p>
              A status read does not establish current provider delivery. A queued command, expired
              destination or cancelled command does not establish that a running ad has stopped.
            </p>
            {result.totalSemantics === "estimated_ceiling" ? (
              <p>The approved total is an estimate, not a guaranteed spending cap.</p>
            ) : null}
            <Link href={`/marketing/campaigns/${encodeURIComponent(result.campaignRef)}`}>
              Open saved campaign
            </Link>
          </>
        ) : null}
        <Button
          disabled={visible === null}
          onClick={() => {
            setLoad(null);
            setAttempt((value) => value + 1);
          }}
          variant="secondary"
        >
          Check latest status
        </Button>
      </Card>
      <Card padding="lg" className={styles.stack}>
        <h2>Ad controls</h2>
        <p>
          Launching and pausing from Automated LO is not available yet. Manage an existing ad in
          HighLevel until these controls are available.
        </p>
        <Link href="/settings/connections">Open connections</Link>
      </Card>
    </section>
  );
}
