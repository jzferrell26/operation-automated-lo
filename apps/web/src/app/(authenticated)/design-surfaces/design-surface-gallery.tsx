"use client";

import type { ReactNode } from "react";

import { RouteError } from "../../../features/shell/components/route-boundary.js";
import { DESIGN_SURFACE_WORKSPACE_NAME } from "../../../copy/design-surfaces.js";

/**
 * PRD-006d D3 and the rubric's section 4, "Boundaries". The route error boundary, photographed.
 *
 * This is a client module for one reason: `RouteError` takes the framework's `reset` callback, and
 * a server component may not hand a function to a client one. Nothing else on the boundary page
 * needs a client module, and nothing else is in here, because
 * `features/auth/components/unverified-email-notice.tsx` reaches the runtime authentication module
 * for the address its form posts to, and that module reaches the database driver. Importing the
 * notice from a client module therefore pulls the driver into the browser bundle, which fails the
 * build. The page renders it on the server instead.
 *
 * The callback does nothing on purpose: this is the state, photographed, not a page that failed.
 */

/**
 * A fixed reference, so the picture does not move between runs. The real boundary quotes whatever
 * the framework gave it, which is different every time and is exactly what a baseline cannot hold.
 */
const PLACEHOLDER_DIGEST = "0000000000";

const placeholderFailure: Error & { digest?: string } = Object.assign(
  new Error(PLACEHOLDER_DIGEST),
  { digest: PLACEHOLDER_DIGEST },
);

function noop(): void {
  // The surface is the subject. There is nothing to retry.
}

export function RouteErrorSurface(): ReactNode {
  return (
    <RouteError error={placeholderFailure} reset={noop} routeName={DESIGN_SURFACE_WORKSPACE_NAME} />
  );
}
