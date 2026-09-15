import { getFoundationSnapshot } from "@oalo/application";
import { phaseZeroUiTokens } from "@oalo/ui";
import { redirect } from "next/navigation.js";

import { canRenderReviewSurface } from "../server/authenticated-workspace-data.js";

export const dynamic = "force-dynamic";

export default function HomePage() {
  if (canRenderReviewSurface()) {
    redirect("/overview");
  }

  const foundation = getFoundationSnapshot();

  return (
    <main style={{ background: phaseZeroUiTokens.background }}>
      <section>
        <p>Operation Automated LO</p>
        <h1>Phase 0 evidence harness</h1>
        <p>
          This deployment contains scaffold, contract, and deterministic fixture checks only.
          Production feature traffic is disabled.
        </p>
        <p>
          Runtime state: <code>{foundation.phase}</code>
        </p>
        <p>
          HighLevel reviewers: the labeled review dashboard is at <a href="/overview">/overview</a>{" "}
          when <code>OALO_REVIEW_SURFACE=authorized</code> is set. Fixtures are demo and not
          connected.
        </p>
      </section>
    </main>
  );
}
