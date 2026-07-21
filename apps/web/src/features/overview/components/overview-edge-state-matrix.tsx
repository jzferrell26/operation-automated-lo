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
          <p className={styles.eyebrow}>Deterministic evidence</p>
          <h2 id="edge-state-title">Overview edge-state matrix</h2>
        </div>
        <p>Each state preserves operational truth and does not invent healthy or zero data.</p>
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
        reason="The validated viewer role does not expose protected metrics."
        requiredRole="Owner or Agency User"
        responsibleParty="Location Owner"
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
      description="The failed operation was a read-only synthetic parse, so retry cannot duplicate provider work."
      details={<p aria-live="polite">Safe retry attempts: {attempts}</p>}
      kind="error"
      primaryAction={
        <Button onClick={() => setAttempts((current) => current + 1)} variant="secondary">
          Retry safe read
        </Button>
      }
      title={state === "route_error" ? "Route error" : "Safe retry available"}
    />
  );
}
