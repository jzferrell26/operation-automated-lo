import type { ProductGuideId } from "./setup-model.js";
import { anchorSelector, GUIDED_SETUP_ANCHORS } from "../guided-setup/anchor-registry.js";

export type ProductGuideStep = Readonly<{ title: string; body: string; selector: string }>;
export type ProductGuide = Readonly<{
  label: string;
  path: string;
  steps: readonly ProductGuideStep[];
}>;
const anchor = (name: string) => `[data-product-guide="${name}"]`;
const campaign = anchorSelector;
export function productGuides(reviewPath: string): Readonly<Record<ProductGuideId, ProductGuide>> {
  return {
    overview: {
      label: "Your dashboard",
      path: "/overview",
      steps: [
        {
          title: "Your business at a glance",
          body: "These numbers reflect the demo leads, partners, and campaigns in your workspace. Open a metric to see the records behind it.",
          selector: `${anchor("metrics")} > article:first-child`,
        },
        {
          title: "See each conversation's next step",
          body: "The pipeline shows where your leads stand. Open the pipeline to change a lead's stage or see its details.",
          selector: `${anchor("pipeline")} figure`,
        },
        {
          title: "Find what you need",
          body: "Search pages and saved campaigns here. Ctrl K or Command K opens search from any screen.",
          selector: '[aria-label="Search workspace"]',
        },
      ],
    },
    profile: {
      label: "Profile & brand",
      path: "/settings",
      steps: [
        {
          title: "Make the workspace yours",
          body: "Start with your name and company. Use demo details while exploring. Changes are saved only when you press Save changes.",
          selector: 'input[name="name"]',
        },
        {
          title: "Choose your market",
          body: "Add the area you serve. This helps prefill your first campaign; it does not connect or validate an advertising audience.",
          selector: 'input[name="region"]',
        },
        {
          title: "Give your brand a voice",
          body: "Write a short tagline. The brand preview changes as you type. Save changes when you're ready.",
          selector: 'textarea[name="tagline"]',
        },
      ],
    },
    partners: {
      label: "Realtor partners",
      path: "/partners",
      steps: [
        {
          title: "Build your partner network",
          body: "Add a Realtor's name, brokerage, and email. Adding a profile does not send an invitation.",
          selector: anchor("add-partner"),
        },
        {
          title: "Find the right relationship",
          body: "Search by name or brokerage. Open a profile to edit the details before your next campaign.",
          selector: `${anchor("partner-search")} input`,
        },
      ],
    },
    pipeline: {
      label: "Leads & pipeline",
      path: "/leads/pipeline",
      steps: [
        {
          title: "Follow the conversation",
          body: "Each column is a stage. Move a lead with the stage dropdown on its card; a drag gesture is never required.",
          selector: `${anchor("lead-stages")} [role="combobox"]`,
        },
        {
          title: "Filter your view",
          body: "Choose a stage to focus on. Arrow keys move through dropdown choices, Enter selects, and Escape keeps the previous choice.",
          selector: '[role="combobox"]',
        },
      ],
    },
    campaign: {
      label: "Create a campaign",
      path: "/marketing/campaigns/new",
      steps: [
        {
          title: "Start with the property",
          body: "Enter the address and state. The Use example property button fills fictional details so you can try the whole workflow.",
          selector: 'input[name="address"]',
        },
        {
          title: "Set the open-house dates",
          body: "Choose a future start and end in your local time. Make sure the end is after the start.",
          selector: campaign(GUIDED_SETUP_ANCHORS.campaignCreateDates),
        },
        {
          title: "Confirm your partner and permissions",
          body: "Your selected Realtor is prefilled. Confirm the permissions yourself before saving; the walkthrough never checks those boxes for you.",
          selector: campaign(GUIDED_SETUP_ANCHORS.campaignCreatePermissions),
        },
        {
          title: "Make the message yours",
          body: "Edit the headline, copy, and call to action. Review the disclosures and consent language before you approve anything.",
          selector: 'input[name="headline"]',
        },
        {
          title: "Choose the area and budget",
          body: "Add a market area and planned daily and total budgets. This demo does not spend money or launch ads.",
          selector: 'input[name="region"]',
        },
        {
          title: "Save, check, and review",
          body: "Save & review campaign runs the content checks. Open the saved campaign to read the findings and make an explicit approval decision.",
          selector: campaign(GUIDED_SETUP_ANCHORS.campaignCreateSubmit),
        },
      ],
    },
    reports: {
      label: "Reports & downloads",
      path: "/reports",
      steps: [
        {
          title: "Choose your report",
          body: "Switch between pipeline distribution, campaign progress and partner contributions. Figures are based on demo data until live accounts are connected.",
          selector: '[aria-label="Report view"]',
        },
        {
          title: "Take the details with you",
          body: "Download the selected report as a CSV. Pipeline uses your saved lead stages; Campaigns and Partners export the records in their selected view.",
          selector: anchor("download-report"),
        },
      ],
    },
    connections: {
      label: "Account connections",
      path: "/settings/connections",
      steps: [
        {
          title: "Know what to connect",
          body: "HighLevel, Meta, and billing are listed here with their current status. View setup explains the requirements without requesting account access.",
          selector: `${anchor("connections")} > div:first-child`,
        },
      ],
    },
    review: {
      label: "Review & approval",
      path: reviewPath,
      steps: [
        {
          title: "Read the content checks",
          body: "Review every finding and the saved campaign details. A blocked campaign cannot be approved.",
          selector: anchor("campaign-findings"),
        },
        {
          title: "Your decision stays yours",
          body: "Choose Approve campaign, then confirm, to record a demo approval. Publishing remains a separate, unavailable action until live accounts are connected.",
          selector: `${anchor("campaign-approval")} button`,
        },
      ],
    },
  };
}
