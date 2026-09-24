"use client";
import { useState } from "react";
import type { HomeReport } from "@oalo/contracts";
import { Button, Icon, LiveRegion } from "@oalo/ui";
import { HomeReportView } from "./report-view.js";
import { postInternalJson } from "../http/internal-api.js";
import "@oalo/ui/product-tokens.css";
import styles from "./homeowners.module.css";

export function SharedHomeReport({ report, secret }: { report: HomeReport; secret: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requested, setRequested] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  async function requestReview() {
    setBusy(true);
    try {
      const response = await postInternalJson(`/api/homeowner-reports/shared/${secret}`, {
        event: "review_requested",
        eventKey: key,
      });
      if (!response.ok)
        throw new Error(
          "This report link is no longer available. Contact your loan officer for an updated report.",
        );
      setRequested(true);
      setMessage("Your loan officer can now see your request to review this report.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your request could not be recorded. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`${styles.workspace} ${styles.sharedPage}`} data-product-shell="true">
      <div className={`${styles.pageHeader} ${styles.screenOnly}`}>
        <h1>Your homeowner report</h1>
        <Button variant="outline" onClick={() => window.print()}>
          Print or save PDF <Icon name="file-text" decorative size="sm" />
        </Button>
      </div>
      <HomeReportView report={report} />
      <section className={`${styles.followupBar} ${styles.screenOnly}`}>
        <div>
          <h2>Let's review your next step.</h2>
          <p>
            Ask {report.input.brand.name} to review the value, loan details and questions behind
            this report.
          </p>
        </div>
        <Button disabled={busy || requested} onClick={() => void requestReview()}>
          {requested ? "Review requested" : busy ? "Recording request…" : "Request a review"}
        </Button>
      </section>
      {message ? <LiveRegion message={message} visible /> : null}
    </main>
  );
}
