import { Stack } from "@oalo/ui";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { PasswordResetNotice } from "../../../features/auth/components/password-reset-notice.js";
import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { readWorkspaceCampaignsForRequest } from "../../../server/campaign-workspace-reads.js";
import { SIGN_IN_PATH } from "../../../server/runtime-authentication.js";

/**
 * PRD-006b D10. The workspace is where a completed password reset lands, so the workspace is where
 * the confirmation is read.
 *
 * The flag is read here rather than in `(authenticated)/layout.tsx` because a layout is never given
 * the query: in the App Router `searchParams` belongs to the page, which is also the only thing
 * that re-renders when the query changes. The notice therefore sits at the top of the page's own
 * content, above the workspace heading, the same position the account screens give a confirmation.
 *
 * The `Stack` is what puts space between the notice and the heading. The workspace screen carries
 * its own internal rhythm but the route's own content area is plain padding, so without a spacing
 * primitive here the notice would sit flush against the heading below it. With no notice the stack
 * holds one child and changes nothing.
 */
export default async function OverviewPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>> }>) {
  const workspace = loadAuthenticatedWorkspace();
  const incoming = await headers();
  const request = new Request("https://oalo.local/overview", { headers: incoming });
  const read = await readWorkspaceCampaignsForRequest(request, process.env);
  // 005A-AC-010. An unauthenticated review visitor never sees an empty tenant list.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  const parameters = await searchParams;
  return (
    <Stack gap="6">
      <PasswordResetNotice parameters={parameters} />
      <OverviewScreen
        overview={workspace.ui.overview}
        session={workspace.ui.session}
        workspaceCampaigns={read.campaigns}
        workspaceMode={workspace.mode}
      />
    </Stack>
  );
}
