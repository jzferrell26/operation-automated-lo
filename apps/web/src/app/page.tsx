import { Link } from "@oalo/ui";
import { redirect } from "next/navigation.js";

import { canRenderReviewSurface } from "../server/authenticated-workspace-data.js";

export const dynamic = "force-dynamic";

/**
 * On a deployment with a workspace, `/` is the workspace's front door and redirects to the
 * overview. Everywhere else this is a developer's own machine, and PRD-006b D5 asks it to read as
 * a plain local landing rather than as an internal status report: no phase, no environment variable
 * name, and no claim that anything is connected.
 *
 * PRD-006d, axis 4: the background comes from `--sf-canvas` through `globals.css`, not from the
 * literal hex in `phaseZeroUiTokens`, which is a bootstrap constant and not a semantic token.
 */
export default function HomePage() {
  if (canRenderReviewSurface()) {
    redirect("/overview");
  }

  return (
    <main>
      <section>
        <p>Automated LO</p>
        <h1>Local demo</h1>
        <p>This is a local demo with sample data. Nothing is connected.</p>
        <p>
          <Link href="/overview" variant="action">
            Open the demo workspace
          </Link>
        </p>
      </section>
    </main>
  );
}
