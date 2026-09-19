"use client";

import { AsyncState, Button } from "@oalo/ui";
import { useState } from "react";

import type { OverviewStateKind } from "../../ui-foundation/model/synthetic-ui.js";
import { getOverviewStatePresentation } from "../model/overview-state.js";
import styles from "./overview.module.css";

export function OverviewEdgeStateMatrix({
  states,
}: Readonly<{ states: readonly OverviewStateKind[] }>) {
  return (
    <section aria-labelledby="edge-state-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Design reference</p>
          <h2 id="edge-state-title">How this page looks in every state</h2>
        </div>
        <p>Each one tells you the truth. None of them invents a healthy reading or a zero.</p>
        <p data-demo-label="overview-edge-state-matrix">
          <strong>Examples only. These cards are not your workspace&apos;s data.</strong>
        </p>
      </div>
      <div className={styles.stateGrid}>
        {states.map((state) =>
          state === "safe_retry" || state === "route_error" ? (
            <SafeRetryState key={state} state={state} />
          ) : (
            <OverviewState key={state} state={state} />
          ),
        )}
      </div>
    </section>
  );
}

export function OverviewState({ state }: Readonly<{ state: OverviewStateKind }>) {
  const presentation = getOverviewStatePresentation(state);

  if (presentation.kind === "permission_restricted") {
    return (
      <AsyncState
        data-overview-state={state}
        description={presentation.description}
        kind="permission_restricted"
        reason="A viewer can't see these numbers."
        requiredRole="A workspace owner"
        responsibleParty="Your workspace owner"
        title={presentation.title}
      />
    );
  }

  return (
    <AsyncState
      data-overview-state={state}
      description={presentation.description}
      kind={presentation.kind}
      title={presentation.title}
    />
  );
}

export function SafeRetryState({ state }: Readonly<{ state: "route_error" | "safe_retry" }>) {
  const [attempts, setAttempts] = useState(0);

  return (
    <AsyncState
      data-overview-state={state}
      description="Nothing was changed, so trying again can't do anything twice."
      details={<p aria-live="polite">Tries: {attempts}</p>}
      kind="error"
      primaryAction={
        <Button onClick={() => setAttempts((current) => current + 1)} variant="secondary">
          Try again
        </Button>
      }
      title={state === "route_error" ? "This page didn't load" : "You can try again"}
    />
  );
}
