import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { Card } from "@oalo/ui";

import styles from "../../../../features/campaigns/components/open-house-draft-builder.module.css";
import { readWorkspaceCampaignsForRequest } from "../../../../server/campaign-workspace-reads.js";
import { SIGN_IN_PATH } from "../../../../server/runtime-authentication.js";

export default async function CampaignListPage() {
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  const read = await readWorkspaceCampaignsForRequest(request, process.env);
  // 005A-AC-010. "No campaigns in this location yet" is a tenant claim, so it needs a session.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  const campaigns = read.campaigns;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>Campaigns in this location</h1>
          <p>
            Only campaigns for the verified location are listed. Provider publication is disabled.
          </p>
        </div>
      </header>
      {campaigns.length === 0 ? (
        <Card padding="md">
          <strong>No campaigns in this location yet.</strong>
          <p>Create an Open House Boost to persist a tenant-backed campaign record.</p>
          <a className="oalo-action-link" href="/marketing/campaigns/new">
            Create marketing campaign
          </a>
        </Card>
      ) : (
        <div className={styles.findings}>
          {campaigns.map((campaign) => (
            <Card key={campaign.campaignRef} padding="md">
              <p className={styles.eyebrow}>{campaign.state.replaceAll("_", " ")}</p>
              <h2>{campaign.headline}</h2>
              <p>{campaign.propertyAddress}</p>
              <p>{campaign.nextActions.find((action) => action.available)?.label}</p>
              <a className="oalo-action-link" href={campaign.detailHref}>
                Open persisted campaign
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
