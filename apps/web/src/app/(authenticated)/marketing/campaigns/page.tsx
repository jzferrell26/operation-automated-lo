import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { Card, EmptyState, Link } from "@oalo/ui";

import { CAMPAIGN_NEXT_ACTION_LABELS, campaignStateLabel } from "../../../../copy/user-language.js";
import styles from "../../../../features/campaigns/components/open-house-draft-builder.module.css";
import { readWorkspaceCampaignsForRequest } from "../../../../server/campaign-workspace-reads.js";
import { SIGN_IN_PATH } from "../../../../server/runtime-authentication.js";
import type { CampaignWorkspaceNextAction } from "@oalo/application";
import { canRenderDashboardPreview } from "../../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../../features/dashboard-preview/dashboard-screen.js";

export default async function CampaignListPage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="campaigns" />;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  const read = await readWorkspaceCampaignsForRequest(request, process.env);
  // 005A-AC-010. "No campaigns in this location yet" is a tenant claim, so it needs a session.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  const campaigns = read.campaigns;

  return (
    <div className={`${styles.page} ${styles.campaignsPage}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>Your campaigns</h1>
          <p>Every Open House Boost you&apos;ve created in this workspace.</p>
        </div>
      </header>
      {campaigns.length === 0 ? (
        /* PRD-008d, the scored baseline review of 2026-10-01, rubric axis 9: an empty list is the
           shared `empty` state, as the overview's empty campaign region already is, not a card
           assembled on this page. It carries the state's own label and glyph, the title at the card
           step, and the one creation action the variant contract allows. */
        <EmptyState
          description="Create your first Open House Boost. It's saved as you go."
          primaryAction={
            <Link href="/marketing/campaigns/new" variant="action">
              Create an Open House Boost
            </Link>
          }
          title="No campaigns yet."
        />
      ) : (
        <div className={styles.findings}>
          {campaigns.map((campaign) => (
            <Card className={styles.campaignCard} key={campaign.campaignRef} padding="md">
              <p className={styles.eyebrow}>
                {campaignStateLabel(campaign.state, campaign.approval?.decision)}
              </p>
              <h2>{campaign.headline}</h2>
              <p>{campaign.propertyAddress}</p>
              <p>{nextStepFor(campaign.nextActions)}</p>
              <Link href={campaign.detailHref} variant="action">
                Open campaign
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The first step this campaign offers, in the product's words.
 *
 * The state and the step both used to be turned into words here, the state by taking the
 * underscores out of it, which put "Preflight failed" on the list page. Both now come from the
 * copy module, so every screen that names a state or a step names it the same way.
 */
function nextStepFor(actions: readonly CampaignWorkspaceNextAction[]): string | undefined {
  const available = actions.find((action) => action.available);
  return available === undefined ? undefined : CAMPAIGN_NEXT_ACTION_LABELS[available.id];
}
