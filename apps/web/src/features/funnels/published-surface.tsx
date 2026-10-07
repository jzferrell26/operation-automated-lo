"use client";
import { useRouter } from "next/navigation.js";
import { FunnelSurface } from "./surface.js";
import { funnelDefinition } from "./catalog.js";
import type { FunnelSnapshot } from "./publication-model.js";
import type { FunnelStep } from "./model.js";
import styles from "./published.module.css";

/** Published pages have no editor shell. Form completion waits for the durable server receipt. */
export function PublishedFunnelSurface({
  id,
  snapshot,
  step,
}: Readonly<{ id: string; snapshot: FunnelSnapshot; step: FunnelStep }>) {
  const router = useRouter();
  const go = (next: FunnelStep) => {
    if (!funnelDefinition(snapshot.kind).steps.some((item) => item.id === next)) return;
    router.push(`/f/${id}/${next}`);
  };
  return (
    <main className={styles.page}>
      <FunnelSurface
        kind={snapshot.kind}
        fields={snapshot.fields}
        brand={snapshot.brand}
        step={step}
        onStep={go}
        published
        capture={async (visitor) => {
          const response = await fetch(`/api/funnel-public/${id}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(visitor),
            credentials: "same-origin",
            redirect: "error",
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Request not confirmed");
          const body: unknown = await response.json();
          if (!body || typeof body !== "object" || !("accepted" in body) || body.accepted !== true)
            throw new Error("Invalid confirmation");
          return { accepted: true };
        }}
      />
    </main>
  );
}
