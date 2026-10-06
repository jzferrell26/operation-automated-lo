import type { FunnelKind, FunnelTextKey } from "./model.js";
export interface EditableText {
  readonly key: FunnelTextKey;
  readonly label: string;
  readonly multiline?: boolean;
  readonly kinds?: readonly FunnelKind[];
}
export const FIELD_GROUPS: readonly Readonly<{
  id: string;
  label: string;
  description: string;
  fields: readonly EditableText[];
}>[] = [
  {
    id: "message",
    label: "Your message",
    description: "Start here. The structure and design are already in place.",
    fields: [
      { key: "eyebrow", label: "Small heading above the headline" },
      { key: "headline", label: "Main headline" },
      { key: "description", label: "Main description", multiline: true },
      { key: "cta", label: "Main button text" },
      { key: "offerTitle", label: "Webinar, resource or offer name" },
    ],
  },
  {
    id: "value",
    label: "What they get",
    description: "Three clear reasons to take the next step.",
    fields: [
      { key: "sectionTitle", label: "Benefits section heading" },
      { key: "benefitOneTitle", label: "First benefit heading" },
      { key: "benefitOneText", label: "First benefit description", multiline: true },
      { key: "benefitTwoTitle", label: "Second benefit heading" },
      { key: "benefitTwoText", label: "Second benefit description", multiline: true },
      { key: "benefitThreeTitle", label: "Third benefit heading" },
      { key: "benefitThreeText", label: "Third benefit description", multiline: true },
      { key: "finalTitle", label: "Final invitation heading" },
      { key: "finalText", label: "Final invitation description", multiline: true },
    ],
  },
  {
    id: "host",
    label: "Your introduction",
    description: "Your name and company come from your saved Brand.",
    fields: [{ key: "hostBio", label: "Host or adviser introduction", multiline: true }],
  },
  {
    id: "questions",
    label: "Common questions",
    description: "Helpful answers, without an extra design step.",
    fields: [
      { key: "faqOneQuestion", label: "First question" },
      { key: "faqOneAnswer", label: "First answer", multiline: true },
      { key: "faqTwoQuestion", label: "Second question" },
      { key: "faqTwoAnswer", label: "Second answer", multiline: true },
      { key: "faqThreeQuestion", label: "Third question" },
      { key: "faqThreeAnswer", label: "Third answer", multiline: true },
    ],
  },
  {
    id: "pages",
    label: "Next-page wording",
    description: "The rest of the journey is designed, too.",
    fields: [
      {
        key: "confirmationTitle",
        label: "Confirmation or watch-page heading",
        kinds: ["live-webinar", "on-demand"],
      },
      {
        key: "confirmationText",
        label: "Confirmation or watch-page description",
        multiline: true,
        kinds: ["live-webinar", "on-demand"],
      },
      {
        key: "bookingTitle",
        label: "Book-a-call heading",
        kinds: ["on-demand", "buyer", "refinance", "lead-magnet"],
      },
      {
        key: "bookingText",
        label: "Book-a-call description",
        multiline: true,
        kinds: ["on-demand", "buyer", "refinance", "lead-magnet"],
      },
      {
        key: "thanksTitle",
        label: "Thank-you heading",
        kinds: ["buyer", "refinance", "lead-magnet"],
      },
      {
        key: "thanksText",
        label: "Thank-you description",
        multiline: true,
        kinds: ["buyer", "refinance", "lead-magnet"],
      },
    ],
  },
  {
    id: "details",
    label: "Links and event details",
    description:
      "Use the direct destination, never an embed code. Actions stay off until you supply it.",
    fields: [
      { key: "videoUrl", label: "Webinar video link (HTTPS)", kinds: ["on-demand"] },
      {
        key: "bookingUrl",
        label: "Booking calendar link (HTTPS)",
        kinds: ["on-demand", "buyer", "refinance", "lead-magnet"],
      },
      { key: "resourceUrl", label: "Resource download link (HTTPS)", kinds: ["lead-magnet"] },
      { key: "webinarUrl", label: "Live webinar join link (HTTPS)", kinds: ["live-webinar"] },
    ],
  },
];
