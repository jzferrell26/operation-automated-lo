"use client";

import { SafeAction } from "@oalo/ui";

export function ProjectedSafeAction({ label }: Readonly<{ label: string }>) {
  return (
    <SafeAction
      decision={{
        state: "blocked",
        explanation: "This synthetic evidence route cannot perform consequential actions.",
        requiredRole: "Authorized production role and verified runtime",
        prerequisite: "A separately authorized production provider path",
        responsibleParty: "Platform Owner",
        nextAction: "Review the synthetic projection only.",
      }}
      label={label}
      onConfirm={() => {
        throw new Error("Synthetic write guard prevented an unavailable action.");
      }}
    />
  );
}
