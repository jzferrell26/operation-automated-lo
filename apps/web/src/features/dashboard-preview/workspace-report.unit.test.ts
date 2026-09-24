import { describe, expect, it } from "vitest";
import { initialPreviewState, previewStateSchema } from "./model.js";
import { buildWorkspaceReport, csvCell } from "./workspace-report.js";

describe("workspace reports", () => {
  it("exports saved stages and only the selected report's records", () => {
    const state = initialPreviewState();
    state.leadStages["sample-lead-1"] = "Closed";
    expect(buildWorkspaceReport(state, "Pipeline")).toContain(
      '"Morgan Ellis","morgan@example.test","Cedar Street open house","Jordan Avery","Closed"',
    );
    expect(buildWorkspaceReport(state, "Campaigns")).not.toContain("Morgan Ellis");
    expect(buildWorkspaceReport(state, "Campaigns").split("\r\n")).toHaveLength(1);
    expect(buildWorkspaceReport(state, "Partners")).toContain('"Jordan Avery","Northside Realty"');
  });
  it("quotes CSV separators and neutralizes spreadsheet formula prefixes", () => {
    expect(csvCell('A "quoted", address')).toBe('"A ""quoted"", address"');
    for (const value of [
      "=1+1",
      "+1+1",
      "-1+1",
      "@SUM(1,1)",
      "  =1+1",
      "\t=1+1",
      "\r=1+1",
      "\n=1+1",
    ])
      expect(csvCell(value)).toBe(`"'${value}"`);
    expect(csvCell("214 Cedar Street")).toBe('"214 Cedar Street"');
  });
  it("opens existing workspaces without message drafts and bounds saved copy", () => {
    const { messageDrafts: _drafts, ...legacy } = initialPreviewState();
    expect(previewStateSchema.parse(legacy).messageDrafts).toEqual([]);
    const draft = { id: "invitation:email", subject: "Open house", body: "Come visit." };
    expect(previewStateSchema.safeParse({ ...legacy, messageDrafts: [draft] }).success).toBe(true);
    expect(previewStateSchema.safeParse({ ...legacy, messageDrafts: [draft, draft] }).success).toBe(
      false,
    );
    expect(
      previewStateSchema.safeParse({ ...legacy, messageDrafts: [{ ...draft, body: " " }] }).success,
    ).toBe(false);
    expect(
      previewStateSchema.safeParse({
        ...legacy,
        messageDrafts: [{ ...draft, body: "x".repeat(5001) }],
      }).success,
    ).toBe(false);
  });
});
