import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticReporting } from "../model/synthetic-reporting.js";
import { ArtifactWorkspace } from "./artifact-workspace.js";
import { CampaignLaunchReview } from "./campaign-launch-review.js";
import styles from "./reporting.module.css";
import { SampleDataNotice } from "./sample-data-notice.js";

type CampaignDetailScreenProps = Readonly<{
  reporting: DeepReadonly<SyntheticReporting>;
}>;

export function CampaignDetailScreen({ reporting }: CampaignDetailScreenProps) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Campaign</p>
          <h1>{reporting.campaign.title}</h1>
          <p>{reporting.campaign.propertyLabel}</p>
        </div>
        <span className={styles.currentVersion}>Version {reporting.campaign.currentVersion}</span>
      </header>

      <SampleDataNotice disclosure={reporting.safety.disclosure} />

      <ArtifactWorkspace campaign={reporting.campaign} />

      <CampaignLaunchReview campaign={reporting.campaign} />
    </div>
  );
}
