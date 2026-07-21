import { getFoundationSnapshot } from "@oalo/application";
import { phaseZeroUiTokens } from "@oalo/ui";

export default function HomePage() {
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
      </section>
    </main>
  );
}
