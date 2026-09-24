import { dollars, sampleLeads, type PreviewState } from "./model.js";

export type ReportView = "Pipeline" | "Campaigns" | "Partners";

export function csvCell(value: string | number): string {
  const text = String(value);
  // Quote every cell and keep spreadsheet formula prefixes inert, including after whitespace.
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildWorkspaceReport(state: PreviewState, view: ReportView): string {
  const rows: (string | number)[][] =
    view === "Campaigns"
      ? [
          [
            "Campaign",
            "Property",
            "Partner",
            "Status",
            "Daily planned budget",
            "Total planned budget",
            "Created",
            "Data source",
          ],
          ...state.campaigns.map((campaign) => [
            campaign.headline,
            campaign.propertyAddress,
            campaign.realtorDisplayName,
            campaign.blocking
              ? "Needs changes"
              : campaign.state === "approved"
                ? "Approved"
                : "Awaiting approval",
            dollars(campaign.dailyBudgetMinor),
            dollars(campaign.totalBudgetMinor),
            campaign.createdAt,
            "Demo draft",
          ]),
        ]
      : view === "Partners"
        ? [
            ["Partner", "Brokerage", "Email", "Demo leads", "Saved campaigns", "Data source"],
            ...state.partners.map((partner) => [
              partner.name,
              partner.company,
              partner.email,
              sampleLeads.filter((lead) => lead.partner === partner.name).length,
              state.campaigns.filter((campaign) => campaign.realtorDisplayName === partner.name)
                .length,
              "Demo workspace",
            ]),
          ]
        : [
            ["Name", "Email", "Source", "Partner", "Stage"],
            ...sampleLeads.map((lead) => [
              lead.name,
              lead.email,
              lead.source,
              lead.partner,
              state.leadStages[lead.id] ?? lead.stage,
            ]),
          ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
