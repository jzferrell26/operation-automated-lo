import { Stack } from "@oalo/ui";
import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { PAGE_TITLES } from "../../../copy/page-titles.js";
import { PasswordResetNotice } from "../../../features/auth/components/password-reset-notice.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { firstNameFrom } from "../../../features/overview/model/home-view.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { readHomeForRequest } from "../../../server/home-reads.js";
import {
  resolveRuntimeShellSession,
  SIGN_IN_PATH,
} from "../../../server/runtime-authentication.js";

/** Writing review W-13: the tab says which page this is. */
export const metadata: Metadata = { title: PAGE_TITLES.home };

/**
 * PRD-009b. Home. The server read (`readHomeForRequest`) answers everything the page draws: the
 * three checklist states from saved records, the topics that have an active ad, and the two lists.
 *
 * PRD-006b D10. The workspace is where a completed password reset lands, so the workspace is where
 * the confirmation is read. The flag is read here rather than in `(authenticated)/layout.tsx`
 * because a layout is never given the query: in the App Router `searchParams` belongs to the page,
 * which is also the only thing that re-renders when the query changes. The notice therefore sits at
 * the top of the page's own content, above the greeting. The `Stack` is what puts space between the
 * notice and the page; with no notice it holds one child and changes nothing.
 *
 * The finished checklist collapses to one line, and `?review=setup` opens it again. That is the
 * only query this page reads besides the reset flag, and any other value is ignored.
 */
export default async function OverviewPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>> }>) {
  const workspace = loadAuthenticatedWorkspace();
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="overview" />;
  const incoming = await headers();
  const request = new Request("https://oalo.local/overview", { headers: incoming });
  const [read, shell] = await Promise.all([
    readHomeForRequest(request, process.env),
    workspace.mode === "review"
      ? resolveRuntimeShellSession(request, process.env)
      : Promise.resolve(undefined),
  ]);
  // 005A-AC-010. An unauthenticated review visitor never sees an empty tenant list.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  const parameters = await searchParams;
  const displayName =
    workspace.mode === "review"
      ? shell?.session?.user.displayName
      : workspace.ui.session.user.displayName;
  return (
    <Stack gap="6">
      <PasswordResetNotice parameters={parameters} />
      <OverviewScreen
        firstName={firstNameFrom(displayName)}
        home={read.home}
        reviewSetup={parameters["review"] === "setup"}
      />
    </Stack>
  );
}
