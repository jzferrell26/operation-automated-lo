/** Names only the existing private property package. Finance and public funnels remain separate work. */
export const CAMPAIGN_STUDIO = Object.freeze({
  eyebrow: "Your marketing starts here",
  title: "One property. One partner. A stronger first impression.",
  description:
    "Bring your property details and Realtor together. Prepare a page, flyer, QR code and copy from one saved campaign.",
  create: "Create a property campaign",
  browse: "View your campaigns",
  boundary: "Private drafts for review. Nothing is published or sent.",
  roles: "You can review your workspace's saved campaigns.",
  illustrationLabel: "One campaign, four connected outputs",
  paperTitle: "Your property campaign",
  paperSubtitle: "Property details and your team, together.",
  identityOne: "Loan officer",
  identityTwo: "Realtor partner",
  draft: "Private draft",
  supportingTitle: "Keep your marketing moving",
  supportingDescription: "Choose an ad or review your account setup below.",
  propertyPath: "/marketing/campaigns/property",
  campaignPath: "/marketing/campaigns",
  outputs: Object.freeze([
    { label: "Page", icon: "globe" as const },
    { label: "Flyer", icon: "file-text" as const },
    { label: "QR code", icon: "layers" as const },
    { label: "Copy", icon: "mail" as const },
  ]),
});

export const PROPERTY_SUMMARY = Object.freeze({
  title: "Your campaign at a glance",
  notice: "Unsaved summary",
  address: "Your property address",
  description: "Your property description will appear here as you add it.",
  brand: "Your saved loan officer brand",
  partner: "Choose your Realtor partner",
  outputs: "After you save",
  outputNote: "Generate the private page, flyer, QR and copy together from the saved campaign.",
  boundary: "This summary is not a generated flyer or a public page.",
  sequenceLabel: "Property campaign steps",
  sequence: Object.freeze(["Add the details", "Generate materials", "Review your package"]),
});
