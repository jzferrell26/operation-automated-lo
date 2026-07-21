import { Card, Icon } from "@oalo/ui";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticReporting } from "../model/synthetic-reporting.js";
import { ArtifactWorkspace } from "./artifact-workspace.js";
import { CampaignLaunchReview } from "./campaign-launch-review.js";
import styles from "./reporting.module.css";

type CampaignDetailScreenProps = Readonly<{
  reporting: DeepReadonly<SyntheticReporting>;
}>;

export function CampaignDetailScreen({ reporting }: CampaignDetailScreenProps) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Synthetic campaign detail</p>
          <h1>{reporting.campaign.title}</h1>
          <p>{reporting.campaign.propertyLabel}</p>
        </div>
        <span className={styles.currentVersion}>
          Current version {reporting.campaign.currentVersion}
        </span>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Read-only local artifact workspace</strong>
          <p>{reporting.safety.disclosure}</p>
        </div>
      </Card>

      <ArtifactWorkspace campaign={reporting.campaign} />

      <CampaignLaunchReview campaign={reporting.campaign} />
    </div>
  );
}
