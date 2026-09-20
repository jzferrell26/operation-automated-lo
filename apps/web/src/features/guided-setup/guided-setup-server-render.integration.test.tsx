import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GUIDED_SETUP_STEPS } from "../../copy/guided-setup-messages.js";
import { GuidedSetupProvider } from "./guided-setup-provider.js";
import { complete, dismiss, initialGuidedSetupProgress } from "./model/progress.js";
import { progressAt } from "./guided-setup.test-support.js";

vi.mock("next/navigation.js", () => ({
  usePathname: () => "/overview",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

/**
 * PRD-006c 006C-AC-005. The welcome step is in the server-rendered HTML.
 *
 * This is the assertion that stops the walkthrough being a flash. `open` is derived from the
 * server's progress value on the very first render rather than set by an effect, so the markup the
 * browser receives already contains the panel. A test that only rendered in jsdom would pass
 * either way, because an effect runs there too; rendering to a string is what makes the difference
 * visible.
 */

const SERVER_NOW = "2026-09-19T12:00:00.000Z";

/**
 * React escapes an apostrophe to `&#x27;` in server markup, and four of the seven step titles have
 * one. Decoding that single entity keeps the assertions readable as the copy they are checking,
 * without pretending the markup is not escaped.
 */
function decodeApostrophes(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

function renderServerHtml(progress: ReturnType<typeof initialGuidedSetupProgress>): string {
  return decodeApostrophes(
    renderToString(
      <GuidedSetupProvider
        canApprove
        enabled
        initialProfile={undefined}
        initialProgress={progress}
        serverNowIso={SERVER_NOW}
        sessionDisplayName="Dana Reyes"
        sessionWorkspaceName="Northgate Lending"
      >
        <main />
      </GuidedSetupProvider>,
    ),
  );
}

describe("guided setup on the server", () => {
  it("puts the welcome step in the first HTML a brand-new account receives", () => {
    const html = renderServerHtml(initialGuidedSetupProgress());
    expect(html).toContain('role="dialog"');
    expect(html).toContain(GUIDED_SETUP_STEPS.welcome.title);
    expect(html).toContain(GUIDED_SETUP_STEPS.welcome.primaryLabel);
  });

  it("puts the resumed step in the first HTML, not the welcome step", () => {
    const html = renderServerHtml(progressAt(3));
    expect(html).toContain(GUIDED_SETUP_STEPS.realtorPartner.title);
    expect(html).not.toContain(GUIDED_SETUP_STEPS.welcome.primaryLabel);
  });

  it("renders no panel for a dismissed or completed setup", () => {
    for (const progress of [
      dismiss(progressAt(3), new Date(SERVER_NOW)),
      complete(initialGuidedSetupProgress(), new Date(SERVER_NOW)),
    ]) {
      expect(renderServerHtml(progress)).not.toContain('role="dialog"');
    }
  });

  it("renders without reaching for a browser API", () => {
    // `renderToString` runs with no `window`, so anything that measured or stored during render
    // would raise here rather than in production.
    expect(() => renderServerHtml(progressAt(4))).not.toThrow();
  });
});
