"use client";

import { PropertyPackageResponseSchema, type PropertyPackageSummary } from "@oalo/contracts";
import { Badge, Button, Link, Surface } from "@oalo/ui";
import { useRef, useState } from "react";
import { PROPERTY_PACKAGE_COPY as COPY } from "../../copy/property-package-messages.js";
import { postInternalJson, refusalFrom } from "../http/internal-api.js";
import {
  PROPERTY_PACKAGE_API_PATH,
  packageOutputHref,
  reloadPropertyPackagePage,
  type PropertyPackagePanelState,
} from "./package-model.js";
import layout from "../campaigns/components/launch.module.css";
import styles from "./property-campaign.module.css";

export interface PropertyPackagePanelProps {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly sourceManifestHash: string;
  readonly canGenerate: boolean;
  readonly state: PropertyPackagePanelState;
  readonly onGenerated?: (summary: PropertyPackageSummary) => void;
}

export function PropertyPackagePanel(props: PropertyPackagePanelProps) {
  const [generated, setGenerated] = useState<PropertyPackageSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const pending = useRef(false);
  const summary = generated ?? (props.state.kind === "ready" ? props.state.summary : null);
  const href = (output: "page" | "flyer" | "qr" | "copy") =>
    packageOutputHref(props.campaignRef, props.campaignVersionRef, output);

  async function generate() {
    if (pending.current || summary || !props.canGenerate) return;
    pending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const response = await postInternalJson(PROPERTY_PACKAGE_API_PATH, {
        campaignRef: props.campaignRef,
        campaignVersionRef: props.campaignVersionRef,
        sourceManifestHash: props.sourceManifestHash,
      });
      if (!response.ok) {
        const refusal = await refusalFrom(response);
        setProblem(
          refusal.code === "PROPERTY_PACKAGE_FONT_UNSUPPORTED"
            ? COPY.font
            : response.status === 409
              ? COPY.stale
              : response.status === 429
                ? COPY.busy
                : COPY.failed,
        );
        return;
      }
      const raw: unknown = await response.json();
      const result = PropertyPackageResponseSchema.safeParse(raw);
      if (
        !result.success ||
        result.data.package.campaignRef !== props.campaignRef ||
        result.data.package.campaignVersionRef !== props.campaignVersionRef ||
        result.data.package.sourceManifestHash !== props.sourceManifestHash
      ) {
        setProblem(COPY.failed);
        return;
      }
      setGenerated(result.data.package);
      props.onGenerated?.(result.data.package);
    } catch {
      setProblem(COPY.failed);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Surface padding="lg">
      <section
        className={layout.form}
        aria-labelledby="property-package-title"
        data-property-package=""
      >
        <div>
          <h2 id="property-package-title" className={layout.cardTitle}>
            {summary ? COPY.ready : COPY.title}
          </h2>
          <p>{summary ? COPY.readyDetail : COPY.intro}</p>
          <p className={layout.note}>{COPY.boundary}</p>
        </div>
        {problem ? (
          <p role="alert" className={layout.problem}>
            {problem}
          </p>
        ) : null}
        {summary ? (
          <>
            <p role="status">
              <Badge tone="info">{COPY.materialsStage}</Badge> {COPY.generated}{" "}
              <time dateTime={summary.generatedAt}>
                {new Date(summary.generatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
              </time>
            </p>
            <div className={styles.outputLinks}>
              <Link href={href("page")} external>
                {COPY.page}
              </Link>
              <Link href={href("flyer")} download>
                {COPY.flyer}
              </Link>
              <Link href={href("qr")} download>
                {COPY.qr}
              </Link>
              <Link href={href("copy")} external>
                {COPY.copy}
              </Link>
            </div>
            <div className={styles.qrPreview}>
              <img src={href("qr")} alt={COPY.qrAlt} width={210} height={266} />
              <p className={layout.note}>{COPY.privateQr}</p>
            </div>
          </>
        ) : props.state.kind === "unavailable" ? (
          <div>
            <p>{COPY.unavailable}</p>
            <Button variant="outline" onClick={reloadPropertyPackagePage}>
              {COPY.reload}
            </Button>
          </div>
        ) : (
          <div>
            {!props.canGenerate ? <p>{COPY.role}</p> : null}
            <Button
              disabled={!props.canGenerate || busy}
              loading={busy}
              loadingLabel={COPY.generating}
              onClick={() => void generate()}
            >
              {busy ? COPY.generating : COPY.generate}
            </Button>
          </div>
        )}
      </section>
    </Surface>
  );
}
