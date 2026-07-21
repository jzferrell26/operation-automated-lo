"use client";

import { Button, Card, Icon } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly, Onboarding } from "../../ui-foundation/model/synthetic-ui.js";
import styles from "./onboarding.module.css";

type OnboardingGuidanceProps = Readonly<{
  guidance: DeepReadonly<Onboarding["guidance"]>;
}>;

export function OnboardingGuidance({ guidance }: OnboardingGuidanceProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <p className={styles.guidanceDismissed} role="status">
        Optional guidance dismissed. The setup checklist remains available below.
      </p>
    );
  }

  return (
    <Card className={styles.guidance} padding="md">
      <Icon decorative name="info" size="sm" tone="info" />
      <div>
        <strong>{guidance.title}</strong>
        <p>{guidance.description}</p>
      </div>
      <Button onClick={() => setVisible(false)} size="sm" variant="secondary">
        {guidance.dismissLabel}
      </Button>
    </Card>
  );
}
