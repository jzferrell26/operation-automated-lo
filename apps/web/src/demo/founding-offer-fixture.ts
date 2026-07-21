export type DemoDeliveryMode = "Automated" | "Manual" | "Read-only";

export type ProofSurface = {
  id: string;
  title: string;
  mode: DemoDeliveryMode;
  caption: string;
  detail: string;
};

export const foundingOffer = {
  price: "$500",
  capacity: "20 founding accounts",
  includedPeriod: "90 days",
  continuation: "$197/month after 90 days",
  refundPolicy:
    "Request a full refund within 14 days of payment if the founding program is not a fit. We do not collect, reimburse, or float ad spend or other third-party charges.",
  exclusions: [
    "Individual funnel builds",
    "Custom automation",
    "Ad management service",
    "Custom compliance drafting",
    "Database cleanup, voice agents, or reactivation",
  ],
} as const;

export const walkthroughSteps = [
  {
    number: "01",
    label: "Set the campaign facts",
    duration: "0:00-0:35",
    mode: "Manual" as const,
  },
  {
    number: "02",
    label: "Review the campaign assets",
    duration: "0:35-1:25",
    mode: "Automated" as const,
  },
  {
    number: "03",
    label: "Record a named approval",
    duration: "1:25-2:00",
    mode: "Manual" as const,
  },
  {
    number: "04",
    label: "Walk through the Meta draft",
    duration: "2:00-2:40",
    mode: "Manual" as const,
  },
  {
    number: "05",
    label: "Trace a synthetic GHL lead",
    duration: "2:40-3:35",
    mode: "Automated" as const,
  },
  {
    number: "06",
    label: "Read the outcome view and offer",
    duration: "3:35-4:20",
    mode: "Read-only" as const,
  },
] as const;

export const proofSurfaces = [
  {
    id: "property-input",
    title: "Property input",
    mode: "Manual",
    caption: "Representative property facts, entered by a loan officer.",
    detail: "314 Juniper Lane · Austin, TX · Open house Sunday, 1-3 PM",
  },
  {
    id: "public-page",
    title: "Co-branded public page",
    mode: "Automated",
    caption: "A synthetic preview of the approved public projection.",
    detail: "Property, partner, disclosure, and one clear lead action in one page.",
  },
  {
    id: "artifacts",
    title: "PDF and creative set",
    mode: "Automated",
    caption: "Illustrated generated artifacts from the same campaign facts.",
    detail: "Flyer, QR destination, and social creative are shown as local fixtures.",
  },
  {
    id: "approval",
    title: "Campaign approval",
    mode: "Manual",
    caption: "A named approver checks the exact version before any launch step.",
    detail: "The visible approval is a synthetic example, not a production record.",
  },
  {
    id: "meta",
    title: "Meta draft walkthrough",
    mode: "Manual",
    caption: "A no-spend, sandbox-style review of campaign settings.",
    detail: "No ad account is connected and this demo cannot create, publish, or spend.",
  },
  {
    id: "ghl-routing",
    title: "GHL lead routing",
    mode: "Automated",
    caption: "A synthetic lead path shows the intended contact-to-pipeline flow.",
    detail: "No provider request, contact lookup, or workflow write runs from this route.",
  },
  {
    id: "results",
    title: "Results dashboard",
    mode: "Read-only",
    caption: "A local, synthetic reporting projection for the campaign story.",
    detail: "Illustrative counts only. It is not connected to a customer account or provider data.",
  },
  {
    id: "offer",
    title: "Founding scope and refund policy",
    mode: "Manual",
    caption: "The commercial promise is visible before anyone decides to apply.",
    detail: "$500 one-time founding offer, 20-account capacity, with no checkout on this page.",
  },
] as const satisfies readonly ProofSurface[];
