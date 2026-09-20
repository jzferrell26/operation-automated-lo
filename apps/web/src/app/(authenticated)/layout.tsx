import { CAMPAIGN_APPROVAL_ROLES } from "@oalo/application";
import { Button, Link } from "@oalo/ui";
import { headers } from "next/headers.js";
import type { ReactNode } from "react";

import {
  ROLE_LABELS,
  SIGN_OUT_LABEL,
  SIGNED_OUT_HEADING,
  SIGNED_OUT_PROMPT,
} from "../../copy/user-language.js";
import { UnverifiedEmailNotice } from "../../features/auth/components/unverified-email-notice.js";
import { GuidedSetupProvider } from "../../features/guided-setup/guided-setup-provider.js";
import { GuidedSetupShellControls } from "../../features/guided-setup/guided-setup-progress.js";
import { AppShell } from "../../features/shell/components/app-shell.js";
import {
  projectNavigationForSession,
  type WorkspaceSessionView,
} from "../../features/shell/model/navigation.js";
import {
  loadAuthenticatedWorkspace,
  REVIEW_SURFACE_DISCLOSURE,
} from "../../server/authenticated-workspace-data.js";
import {
  CSRF_META_NAME,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
  resolveRuntimeShellSession,
} from "../../server/runtime-authentication.js";
import { readSetupPreferencesForRequest } from "../../server/setup-preferences.js";

export const dynamic = "force-dynamic";

/**
 * The shell a visitor sees before signing in. It says so rather than borrowing the demo persona,
 * which would read as a signed-in identity on a deployment that checks real sessions. Capabilities
 * are empty, so every capability-gated navigation item projects as restricted.
 */
const SIGNED_OUT_SESSION: WorkspaceSessionView = Object.freeze({
  safety: Object.freeze({
    dataMode: "synthetic" as const,
    writesEnabled: false as const,
    disclosure: REVIEW_SURFACE_DISCLOSURE,
  }),
  user: Object.freeze({
    displayName: SIGNED_OUT_HEADING,
    roleLabel: SIGNED_OUT_PROMPT,
    capabilities: Object.freeze([]),
  }),
  location: Object.freeze({
    displayName: SIGNED_OUT_HEADING,
    source: SIGNED_OUT_PROMPT,
  }),
});

/**
 * PRD-006c D5 step 6. Which branch of the approve step this person sees.
 *
 * The shell projects a role into the label a user reads, and the label is what the layout has, so
 * the comparison is made in label space. The set is built from the same `CAMPAIGN_APPROVAL_ROLES`
 * the approval command enforces rather than typed out again, so the step can never offer to
 * approve to somebody the command would refuse. A self-serve account from PRD-006a is a
 * `location_admin` and reaches the approve branch; a seeded creator reaches the hand-off branch.
 */
const APPROVER_CAPABLE_ROLE_LABELS: ReadonlySet<string> = new Set(
  CAMPAIGN_APPROVAL_ROLES.map((role) => ROLE_LABELS[role]),
);

/**
 * PRD-005a 005A-AC-011 and 005A-AC-012.
 *
 * In synthetic mode nothing changes: the shell renders the fixture session exactly as before.
 *
 * In review mode the shell renders only what a verified principal supports. Without a session it
 * renders the signed-out shell above and a link to the sign-in page, never the fixture
 * persona. The read pages are what refuse to render tenant content; the layout's job is to stop
 * claiming an identity it does not have.
 *
 * The CSRF element carries `createSessionBoundCsrfToken` output, an HMAC of the session reference
 * under the server secret. The `__Host-oalo_session` cookie value never reaches the document.
 *
 * PRD-006c D5 adds the guided setup. Progress and the profile are read here, on the server, before
 * anything renders, and handed to the provider as props. That is what makes the welcome step part
 * of the first HTML the browser receives rather than something that appears a moment later.
 */
export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode !== "review") {
    const fixture = workspace.ui;
    return (
      <AppShell
        navigation={projectNavigationForSession(fixture.navigation, fixture.session)}
        session={fixture.session}
        workspaceMode={workspace.mode}
      >
        {children}
      </AppShell>
    );
  }

  const incoming = await headers();
  const request = new Request("https://oalo.local/", { headers: incoming });
  const shell = await resolveRuntimeShellSession(request, process.env);
  const session = shell.session ?? SIGNED_OUT_SESSION;
  const preferences = shell.authenticated
    ? await readSetupPreferencesForRequest(request, process.env)
    : undefined;

  /**
   * PRD-006d's named-state review, F-21. The sign-out control belongs to the shell's account area,
   * not to the page.
   *
   * `03-components/application-shell-and-navigation.md` puts identity and its controls in the rail
   * and the topbar's account control, and rubric axis 1 asks that the eye land on the page's own
   * title. Until 2026-09-20 this form was the first child of `<main>`, so every workspace page
   * opened with a button above its own heading. It is the same plain form post it always was: a
   * hidden field, no client script, the label from the copy module, and the 44px target the
   * `Button` primitive carries.
   *
   * A form post cannot set x-csrf-token, so the session-bound token travels as a field and the
   * sign-out route promotes it to the header before the 005a mutation gate sees it. The value is
   * the same HMAC the meta element carries; the cookie never reaches the document either way.
   */
  const signOutControl = (
    <form action={SIGN_OUT_PATH} method="post">
      {shell.csrfToken === undefined ? null : (
        <input name="csrfToken" type="hidden" value={shell.csrfToken} />
      )}
      <Button type="submit" variant="secondary">
        {SIGN_OUT_LABEL}
      </Button>
    </form>
  );

  const shellBody = (
    <AppShell
      accountControls={shell.authenticated ? signOutControl : undefined}
      headerControls={shell.authenticated ? <GuidedSetupShellControls /> : undefined}
      navigation={projectNavigationForSession(workspace.ui.navigation, session)}
      session={session}
      workspaceMode={workspace.mode}
    >
      {shell.authenticated ? null : (
        <p>
          {SIGNED_OUT_HEADING}{" "}
          <Link href={SIGN_IN_PATH} variant="action">
            {SIGNED_OUT_PROMPT}
          </Link>
        </p>
      )}
      {/*
        PRD-006b D10 and 006A-AC-021. The unverified notice sits above the page's own content,
        where Wave 7g put the saved-password notice, so it is read before the workspace rather
        than found underneath it. It lives in the layout rather than on a page because it is true
        of every page until the person confirms, and it is not read from the query for the same
        reason: it clears itself when the address is confirmed, not on the next navigation.
      */}
      <UnverifiedEmailNotice csrfToken={shell.csrfToken} state={session.emailVerification} />
      {children}
    </AppShell>
  );

  return (
    <>
      {shell.csrfToken === undefined ? null : (
        <meta content={shell.csrfToken} name={CSRF_META_NAME} />
      )}
      {preferences === undefined ? (
        shellBody
      ) : (
        <GuidedSetupProvider
          campaignAwaitingDecision={preferences.awaitingDecision}
          canApprove={APPROVER_CAPABLE_ROLE_LABELS.has(session.user.roleLabel)}
          enabled
          initialProfile={preferences.profile}
          initialProgress={preferences.progress}
          savedCampaign={preferences.campaign}
          serverNowIso={new Date().toISOString()}
          sessionDisplayName={session.user.displayName}
          sessionWorkspaceName={session.location.displayName}
        >
          {shellBody}
        </GuidedSetupProvider>
      )}
    </>
  );
}
