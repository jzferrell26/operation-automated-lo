import { Stack } from "@oalo/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import type { ReactNode } from "react";

import {
  DESIGN_SURFACE_LEAD,
  DESIGN_SURFACE_SECTIONS,
  DESIGN_SURFACE_TITLE,
  DESIGN_SURFACE_WORKSPACE_NAME,
} from "../../../copy/design-surfaces.js";
import { UnverifiedEmailNotice } from "../../../features/auth/components/unverified-email-notice.js";
import { RouteLoading } from "../../../features/shell/components/route-boundary.js";
import { canRenderSyntheticDemo } from "../../../server/authenticated-workspace-data.js";
import { RouteErrorSurface } from "./design-surface-gallery.js";
import styles from "./design-surfaces.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: DESIGN_SURFACE_TITLE,
  description: DESIGN_SURFACE_LEAD,
};

/**
 * One named region per surface, so a screen reader can move between the three and so a reviewer's
 * note can name the one it is about. Deliberately not the `Surface` primitive: these carry no
 * surface of their own, because what is being reviewed is the state inside them.
 */
function ScoredSurface({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): ReactNode {
  return <section aria-label={label}>{children}</section>;
}

/**
 * PRD-006d D3, the rubric's section 4 "Boundaries" entry, and the unverified-email notice.
 *
 * The route error boundary, the route loading boundary, and the unverified-email notice are three
 * states the rubric scores and that nothing in either browser suite had ever looked at, because
 * each of them appears only when something fails, something is slow, or an address has not been
 * confirmed. A state a suite cannot reach is a state nothing holds in place, which is the same
 * argument F-22 made for the sign-up refusal.
 *
 * The gate is the one the email preview already uses: `canRenderSyntheticDemo()`, so the page
 * exists on a local machine, on a preview deployment, and in the test runs, and is the not-found
 * page everywhere else. Both sides are asserted, the way 006D-AC-018 asks of the demo route: the
 * run that serves it proves all three surfaces render, and the run that must not serve it proves
 * the not-found page is what arrives and that none of the three is on it.
 *
 * The status line on that not-found answer is 200 rather than 404, and that is the route group
 * rather than the gate. The layout above this page reads a session before it renders, so the
 * response has begun streaming by the time `notFound()` is called and the status is already
 * committed. `/email-preview`, which has no such layout, answers a real 404. The surface is not
 * served either way, which is what the gate is for.
 *
 * It sits inside the signed-in group so that the shell around it is the real shell rather than a
 * second composition of one, which is what makes the unverified notice's cell a picture of what
 * the product does. Nothing on it reads a session, a workspace, or a person: every value is a
 * placeholder, so a picture of it is safe to keep in the repository.
 *
 * Two of the three render from here, on the server. Only the error boundary needs a client module,
 * because it takes the framework's `reset` callback; the notice must not be in one, because it
 * reaches the runtime authentication module for the address its form posts to and that module
 * reaches the database driver.
 */
export default function DesignSurfacesPage() {
  if (!canRenderSyntheticDemo()) notFound();

  return (
    <Stack align="stretch" className={styles.page} gap="6">
      <Stack align="stretch" className={styles.header} gap="2">
        <h1>{DESIGN_SURFACE_TITLE}</h1>
        <p>{DESIGN_SURFACE_LEAD}</p>
      </Stack>
      <ScoredSurface label={DESIGN_SURFACE_SECTIONS.failure}>
        <RouteErrorSurface />
      </ScoredSurface>
      <ScoredSurface label={DESIGN_SURFACE_SECTIONS.waiting}>
        <RouteLoading routeName={DESIGN_SURFACE_WORKSPACE_NAME} />
      </ScoredSurface>
      <ScoredSurface label={DESIGN_SURFACE_SECTIONS.unconfirmed}>
        {/*
          The notice as the shell renders it for somebody who has not confirmed their address yet,
          with the control that sends the link again. `csrfToken` is absent, so the hidden field the
          real shell carries is not drawn here and this page posts nothing.
        */}
        <UnverifiedEmailNotice csrfToken={undefined} state="unverified" />
      </ScoredSurface>
    </Stack>
  );
}
