"use client";
import { useRouter } from "next/navigation.js";
import { FunnelSurface } from "./surface.js";
import { funnelDefinition } from "./catalog.js";
import type { FunnelSnapshot } from "./publication-model.js";
import type { FunnelStep } from "./model.js";
import styles from "./published.module.css";
import { postInternalJson } from "../http/internal-api.js";
import { FunnelCaptureError } from "./visitor-model.js";

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
          const response = await postInternalJson(`/api/funnel-public/${id}`, visitor);
          if (!response.ok)
            throw new FunnelCaptureError(
              response.status === 409
                ? "conflict"
                : response.status === 410
                  ? "closed"
                  : response.status === 429
                    ? "limited"
                    : "unavailable",
            );
          const body: unknown = await response.json();
          if (!body || typeof body !== "object" || !("accepted" in body) || body.accepted !== true)
            throw new Error("Invalid confirmation");
          return { accepted: true };
        }}
      />
    </main>
  );
}
