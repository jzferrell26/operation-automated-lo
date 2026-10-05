export const PROPERTY_CAMPAIGN_COPY = Object.freeze({
  title: "Create a property campaign",
  eyebrow: "Property and Realtor partner",
  intro:
    "Start with one property and the Realtor you are helping. Save the details together before preparing the campaign materials.",
  boundary:
    "This step saves a draft. It does not generate materials, publish an ad, spend money, or send a message.",
  synthetic: "Local demonstration. Use made-up property details only.",
  role: "Your account can view campaigns but cannot create them.",
  brandMissing:
    "Add your name, company, and both NMLS numbers in Brand before saving a property campaign.",
  brandAction: "Review your brand",
  partnersMissing: "Add a Realtor partner before creating this campaign.",
  partnersAction: "Manage Realtor partners",
  brandLabel: "Your saved brand",
  partnerLabel: "Realtor partner",
  partnerPlaceholder: "Choose a saved partner",
  propertyTitle: "The property",
  addressLabel: "Property address",
  stateLabel: "State",
  statePlaceholder: "Choose a state",
  descriptionLabel: "Property description",
  eventTitle: "The open house",
  startsLabel: "Starts",
  endsLabel: "Ends",
  timeNote: "Enter times in your device's time zone. The saved campaign keeps the exact time.",
  permissionTitle: "Permission to use the materials",
  propertyPermission: "I have permission to market this property and use the details I entered.",
  partnerPermission:
    "The Realtor has given permission to use their identity on this campaign's shared materials.",
  permissionNote:
    "Choosing a saved partner does not grant permission. Realtor identity will not be added to paid ads.",
  save: "Save campaign draft",
  saving: "Saving your draft",
  saved: "Draft saved",
  invalid: "Check the required fields and make sure the open house ends after it starts.",
  saveFailed:
    "Your save could not be confirmed. Your details are still here. Try again with the same details or check your campaigns before starting another draft.",
  conflict:
    "This save already belongs to different details. Check your campaigns before creating another draft.",
  campaigns: "Back to campaigns",
  draftIntro:
    "Your property, partner, and brand are saved together. The campaign is not ready to launch.",
  materialsTitle: "Your campaign package",
  materialsIntro: "Save your details once, then prepare and review each part of the campaign.",
  brandTitle: "Loan officer",
  partnerTitle: "Realtor partner",
  permissionMissing: "Permission has not been confirmed.",
  permissionConfirmed: "Permission was confirmed when this draft was saved.",
  stages: Object.freeze([
    {
      title: "Property and partner",
      status: "Saved",
      detail: "The details shown here are saved together in this campaign version.",
    },
    {
      title: "Property page, flyer, and QR code",
      status: "Not generated",
      detail: "These shared materials must be generated from this version and reviewed.",
    },
    {
      title: "Paid promotion",
      status: "Not prepared",
      detail:
        "A separate loan-officer ad needs its own creative, budget, and review. Realtor branding stays off paid ads.",
    },
    {
      title: "Approval",
      status: "Not ready",
      detail:
        "Review the actual outputs before anyone approves them. Saving this draft is not approval.",
    },
    {
      title: "Lead capture and follow-up",
      status: "Not verified",
      detail: "The campaign's lead path into HighLevel must be connected and tested.",
    },
    {
      title: "Campaign results",
      status: "Not live",
      detail: "Results appear only after real campaign activity has been confirmed.",
    },
  ]),
});
