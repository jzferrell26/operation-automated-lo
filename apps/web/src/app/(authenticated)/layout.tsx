import { headers } from "next/headers.js";
import type { ReactNode } from "react";

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
import { SIGN_IN_COPY, SIGN_OUT_CONTROL_LABEL } from "../../features/auth/strings.js";

export const dynamic = "force-dynamic";

/**
 * The shell a review visitor sees before presenting a session. It states that fact rather than
 * borrowing the demo persona: the fixture "Demo reviewer" in "Demo workspace (not connected)" reads
 * as a signed-in identity, and on a deployment that verifies real sessions it is not one.
 * Capabilities are empty, so every capability-gated navigation item projects as restricted.
 */
const UNAUTHENTICATED_REVIEW_SESSION: WorkspaceSessionView = Object.freeze({
  safety: Object.freeze({
    dataMode: "synthetic" as const,
    writesEnabled: false as const,
    disclosure: REVIEW_SURFACE_DISCLOSURE,
  }),
  user: Object.freeze({
    displayName: "You're signed out",
    roleLabel: "Not signed in",
    capabilities: Object.freeze([]),
  }),
  location: Object.freeze({
    displayName: "No workspace yet",
    source: "Sign in to see your workspace.",
  }),
});

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
  const shell = await resolveRuntimeShellSession(
    new Request("https://oalo.local/", { headers: incoming }),
    process.env,
  );
  const session = shell.session ?? UNAUTHENTICATED_REVIEW_SESSION;

  return (
    <>
      {shell.csrfToken === undefined ? null : (
        <meta content={shell.csrfToken} name={CSRF_META_NAME} />
      )}
      <AppShell
        navigation={projectNavigationForSession(workspace.ui.navigation, session)}
        session={session}
        workspaceMode={workspace.mode}
      >
        {shell.authenticated ? (
          <form action={SIGN_OUT_PATH} method="post">
            {/*
              A form post cannot set x-csrf-token, so the session-bound token travels as a field and
              the sign-out route promotes it to the header before the 005a mutation gate sees it.
              The value is the same HMAC the meta element carries; the cookie never reaches the
              document either way.
            */}
            {shell.csrfToken === undefined ? null : (
              <input name="csrfToken" type="hidden" value={shell.csrfToken} />
            )}
            <button type="submit">{SIGN_OUT_CONTROL_LABEL}</button>
          </form>
        ) : (
          <p>
            You're signed out.{" "}
            <a className="oalo-action-link" href={SIGN_IN_PATH}>
              {SIGN_IN_COPY.title}
            </a>
          </p>
        )}
        {children}
      </AppShell>
    </>
  );
}
