import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009a, 009A-AC-015: the record check for the supersession register rows that live in
 * `library/knowledge/private/ux-ui/` (rows S-45 to S-71 and S-100 to S-103 of PRD-009f).
 *
 * Each cited line is found by its original text, not by its line number, because a note inserted
 * after a heading moves every line below it. The check asserts that the original text is still
 * there (superseded text stays readable, never deleted), that "PRD-009" appears within three lines
 * of it, and that the row's own identifier appears in the file, so a note can always be traced
 * back to its register row. A range is checked at both ends; a whole-file row at its title.
 */

const UX_UI = "library/knowledge/private/ux-ui/";

/** [row, file, the start of the cited line as it stood before PRD-009] */
const CITED_LINES: readonly (readonly [string, string, string])[] = [
  ["S-45", "00-design-brief.md", "Operation Automated LO is an operating layer for mortgage"],
  ["S-45", "00-design-brief.md", "The founding product wedge is Open House Boost."],
  [
    "S-46",
    "00-design-brief.md",
    "The approved visual baseline is the second Claude Design package",
  ],
  ["S-46", "00-design-brief.md", "The package establishes the root Platform Overview,"],
  ["S-47", "00-design-brief.md", "- Broker Marketplace: restrained ambient entry motion"],
  ["S-47", "00-design-brief.md", "The resulting identity is a flat-modern operational interface"],
  ["S-48", "00-design-brief.md", "- A generic CRM clone"],
  ["S-49", "00-design-brief.md", "The root application shell represents the whole platform."],
  ["S-49", "00-design-brief.md", "The campaign dashboard shown in `Dashboard.dc.html`"],
  ["S-50", "00-design-brief.md", "The Platform Overview must answer five questions:"],
  ["S-50", "00-design-brief.md", "- Automated LO workspace module status"],
  ["S-51", "00-design-brief.md", "- Self-onboarding"],
  ["S-51", "00-design-brief.md", "- Open House Boost campaigns"],
  ["S-51", "00-design-brief.md", "- AI-assisted brand and campaign drafting"],
  ["S-52", "00-design-brief.md", "- Canvas: cool neutral background"],
  ["S-52", "00-design-brief.md", "Depth is communicated through border, background contrast,"],
  ["S-53", "00-design-brief.md", "- Cobalt is the primary action color."],
  ["S-53", "00-design-brief.md", "- Teal is a supporting accent,"],
  ["S-54", "00-design-brief.md", "- Interface font: Geist, with system sans-serif fallback"],
  ["S-54", "00-design-brief.md", "- Caption and freshness: 10.5px, weight 400"],
  ["S-55", "00-design-brief.md", "- Controls: 8px"],
  ["S-55", "00-design-brief.md", "- Status badges: pill only when the compact status shape"],
  ["S-56", "00-design-brief.md", "- First visit resolves the current operating-system preference."],
  ["S-57", "00-design-brief.md", "Desktop uses the full navigation sidebar."],
  ["S-57", "00-design-brief.md", "- A fixed compact rail with no toggle at 768 or 1180"],
  ["S-58", "03-components/application-shell-and-navigation.md", "- Fixed deep navy sidebar"],
  [
    "S-58",
    "03-components/application-shell-and-navigation.md",
    "- Expanded Marketing Suite reveals its sub-navigation",
  ],
  ["S-58", "03-components/application-shell-and-navigation.md", "### Tablet and mobile"],
  [
    "S-58",
    "03-components/application-shell-and-navigation.md",
    "Ruled 2026-09-20 by `design-system-guardian`, closing rubric delta D-008",
  ],
  ["S-58", "03-components/application-shell-and-navigation.md", "## Navigation inventory"],
  [
    "S-58",
    "03-components/application-shell-and-navigation.md",
    "Marketing Suite contains Campaigns, Property Sites,",
  ],
  ["S-59", "03-components/onboarding-checklist.md", "The checklist contains exactly these phases"],
  [
    "S-59",
    "03-components/onboarding-checklist.md",
    "Synthetic lead is visibly labeled as synthetic",
  ],
  ["S-60", "03-components/campaign-and-artifact-workflow.md", "## Campaign stepper"],
  [
    "S-60",
    "03-components/campaign-and-artifact-workflow.md",
    "The stepper displays save state, completeness,",
  ],
  ["S-60", "03-components/campaign-and-artifact-workflow.md", "## Artifact workspace"],
  [
    "S-60",
    "03-components/campaign-and-artifact-workflow.md",
    "Every artifact displays status, version, source profile versions,",
  ],
  [
    "S-61",
    "03-components/metric-source-and-freshness.md",
    "At 1180px, the business-pulse metric order is preserved",
  ],
  ["S-62", "04-screens/platform-overview.md", "# Platform Overview"],
  ["S-63", "04-screens/campaign-lifecycle.md", "## Create"],
  [
    "S-63",
    "04-screens/campaign-lifecycle.md",
    "The launch screen requires exact confirmation for a real-money provider write.",
  ],
  [
    "S-64",
    "04-screens/marketing-suite-campaign-performance.md",
    "# Marketing Suite Campaign Performance",
  ],
  ["S-65", "04-screens/onboarding-brand-and-platform-settings.md", "- Leads and Pipeline"],
  ["S-65", "04-screens/onboarding-brand-and-platform-settings.md", "- Marketplace module status"],
  ["S-66", "04-screens/workspace-page-completion.md", "- Automations explains and simulates"],
  ["S-66", "04-screens/workspace-page-completion.md", "- Reports exports the selected view"],
  [
    "S-66",
    "04-screens/workspace-page-completion.md",
    "- Lead lists and pipeline show stage totals,",
  ],
  ["S-67", "04-screens/homeowner-reports.md", "Use the existing navy, cobalt, text/surface/status"],
  ["S-68", "06-review-rubric.md", "10. **Consistency with the canvases.**"],
  ["S-68", "06-review-rubric.md", "    the review names the specs it follows."],
  ["S-69", "06-review-rubric.md", "#### D-002, ruled: confirmed, and the invariant"],
  ["S-69", "06-review-rubric.md", "discussion."],
  ["S-70", "06-review-rubric.md", "#### D-008, ruled: the tablet rail is collapsible"],
  ["S-70", "06-review-rubric.md", "  requirement with an owner, not a defect against this ruling."],
  ["S-71", "06-review-rubric.md", "## 4. Screens in scope"],
  [
    "S-71",
    "06-review-rubric.md",
    "  preview, scored on hierarchy, typography, contrast, and copy only.",
  ],
  ["S-100", "04-screens/dashboard-preview.md", "Jonathan rejected the initial screens"],
  ["S-100", "04-screens/dashboard-preview.md", "The overview prioritizes business metrics,"],
  ["S-100", "04-screens/dashboard-preview.md", "Product-specific tokens live in"],
  [
    "S-101",
    "03-components/icon-and-icon-button.md",
    "Navigation icons follow the deep navy surface",
  ],
  ["S-102", "03-components/stepper.md", "and the six-stage Open House Boost stepper later."],
  ["S-103", "02-surfaces-and-borders.css", " *   .ui-nav             -> `.desktopSidebar`"],
];

const REGISTER_ROWS = [
  ...Array.from({ length: 27 }, (_, index) => `S-${String(45 + index)}`),
  "S-100",
  "S-101",
  "S-102",
  "S-103",
];

function linesOf(file: string): readonly string[] {
  return readFileSync(resolve(UX_UI, file), "utf8").split("\n");
}

describe("the ux-ui supersession notes (009A-AC-015)", () => {
  it("covers every register row whose file is under ux-ui", () => {
    expect([...new Set(CITED_LINES.map(([row]) => row))].sort()).toEqual([...REGISTER_ROWS].sort());
  });

  it.each(CITED_LINES)(
    "%s: %s keeps the cited text, with PRD-009 beside it",
    (row, file, start) => {
      const lines = linesOf(file);
      const found = lines.flatMap((line, index) => (line.startsWith(start) ? [index] : []));
      expect(found, `the cited line is still there, once: ${start}`).toHaveLength(1);
      const at = found[0] ?? 0;
      const neighbourhood = lines.slice(Math.max(0, at - 3), at + 4).join("\n");
      expect(neighbourhood, `PRD-009 within 3 lines of ${file}: ${start}`).toContain("PRD-009");
      expect(lines.join("\n")).toMatch(new RegExp(`\\(${row}[;,)]`, "u"));
    },
  );

  /**
   * Every note carries a verb and a day: "Superseded on 2026-10-01 by PRD-009". The register rows
   * this file checks were applied on 2026-10-01, and a later lane of the same PRD adds notes of its
   * own to the same files with the day it wrote them (S-108, 2026-10-03, on
   * `04-screens/workspace-page-completion.md`), so the day is any in October 2026, the month the
   * PRD ran. The pattern used to name the one day 2026-10-01 and failed that later note, though the
   * note is dated and names what it does, which is all this check asks.
   */
  it("dates every note and names what it does", () => {
    for (const file of new Set(CITED_LINES.map(([, cited]) => cited))) {
      const notes = linesOf(file).filter((line) => line.includes("by PRD-009"));
      for (const note of notes) {
        expect(note, `${file}: ${note.slice(0, 60)}`).toMatch(
          /(Superseded|Superseded in part|Re-scoped|Amended)\** on 2026-10-\d{2} by PRD-009/u,
        );
      }
    }
  });

  it("names the PRD-009 mockups as the visual reference and the canvases as history", () => {
    const readme = readFileSync(resolve(UX_UI, "README.md"), "utf8");
    expect(readme).toContain("## Visual reference since 2026-10-01: the PRD-009 mockups");
    expect(readme).toMatch(/\*\*Claude Design canvases\*\*[^\n]*\*\*history\*\*/u);
    expect(readme).toContain("prd-009-marketing-toolkit/design/mockups/");
  });
});
