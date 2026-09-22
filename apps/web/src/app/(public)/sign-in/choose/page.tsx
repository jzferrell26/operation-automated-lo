import { Link } from "@oalo/ui";
import type { Metadata } from "next";

import { assertAuthPageIsServed } from "../../../../features/auth/auth-page-gate.js";
import { AuthPanel } from "../../../../features/auth/components/auth-panel.js";
import { CHOOSE_WORKSPACE, SIGN_IN } from "../../../../features/auth/strings.js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a workspace",
  description: "Choose which Automated LO workspace to work in.",
};

/**
 * PRD-006a D5 and 006A-AC-016. The workspace choice.
 *
 * The choice itself is offered on the sign-in page, immediately after a sign-in that turns out to
 * reach more than one workspace, because the list and the five-minute single-use token that
 * carries it live only for that page's lifetime and are never written to browser storage.
 *
 * This page exists for the person who arrives here directly, with no choice in hand: it says so
 * and sends them back rather than answering 404 at a path the sign-in response names.
 */
export default async function ChooseWorkspacePage() {
  assertAuthPageIsServed();
  return (
    <AuthPanel lead="Sign in again and we'll ask you which one." title={CHOOSE_WORKSPACE.title}>
      <p>
        <Link href="/sign-in" variant="action">
          {SIGN_IN.title}
        </Link>
      </p>
    </AuthPanel>
  );
}
