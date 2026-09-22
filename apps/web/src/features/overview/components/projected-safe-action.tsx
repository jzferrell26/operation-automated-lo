"use client";

import { SafeAction } from "@oalo/ui";

export function ProjectedSafeAction({ label }: Readonly<{ label: string }>) {
  return (
    <SafeAction
      decision={{
        state: "blocked",
        explanation: "This isn't available yet. Nothing here can spend, publish, or send.",
        requiredRole: "Nobody yet",
        prerequisite: "HighLevel, Meta, and Stripe connected to your workspace",
        responsibleParty: "Automated LO",
        nextAction: "Connect your accounts when you're ready.",
      }}
      label={label}
      onConfirm={() => {
        throw new Error("A blocked action was confirmed; nothing may run from this control.");
      }}
    />
  );
}
