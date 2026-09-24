import { z } from "zod";
import { HomeBrandSchema, type HomeBrand } from "@oalo/contracts";

export const workspaceRoutes = {
  "/marketing": "marketing",
  "/marketing/property-sites": "property-sites",
  "/marketing/creative": "creative",
  "/marketing/ads": "ads",
  "/marketing/messaging": "messaging",
  "/marketing/blueprints": "blueprints",
  "/partners": "partners",
  "/leads": "leads",
  "/leads/pipeline": "pipeline",
  "/automations": "automations",
  "/marketplace": "marketplace",
  "/settings": "settings",
  "/settings/profile": "profile",
  "/settings/routing": "routing",
  "/settings/team": "team",
  "/settings/billing": "billing",
} as const;
export type WorkspaceView = (typeof workspaceRoutes)[keyof typeof workspaceRoutes];

export const PartnerSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(120),
    company: z.string().trim().min(2).max(160),
    email: z.union([z.literal(""), z.email().max(200)]),
    phone: z.string().trim().max(40),
  })
  .strict();
export const PartnersSchema = z
  .object({
    items: z
      .array(PartnerSchema)
      .max(25)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        "Partner entries must be unique",
      ),
  })
  .strict();
export type WorkspacePartner = z.infer<typeof PartnerSchema>;
export const messageKeys = [
  "invitation_email",
  "invitation_sms",
  "followup_email",
  "followup_sms",
  "partner_update_email",
  "partner_update_sms",
] as const;
export const MessageKeySchema = z.enum(messageKeys);
export type MessageKey = z.infer<typeof MessageKeySchema>;
export const MessageSchema = z
  .object({ subject: z.string().max(160), body: z.string().trim().min(1).max(2500) })
  .strict();
export type WorkspaceMessage = z.infer<typeof MessageSchema>;
export const PreferenceKeySchema = z.enum(["brand", "partners", ...messageKeys]);
export type PreferenceKey = z.infer<typeof PreferenceKeySchema>;
export const versioned = <S extends z.ZodType>(schema: S) =>
  z.object({ revision: z.uuid(), value: schema }).strict();
export const WorkspacePreferencesSchema = z
  .object({
    brand: versioned(HomeBrandSchema).nullable(),
    partners: versioned(PartnersSchema).nullable(),
    messages: z.partialRecord(MessageKeySchema, versioned(MessageSchema)),
  })
  .strict();
export type WorkspacePreferences = z.infer<typeof WorkspacePreferencesSchema>;
const RevisionSchema = z.uuid().nullable();
export const WorkspacePreferenceCommandSchema = z.union([
  z
    .object({ key: z.literal("brand"), expectedRevision: RevisionSchema, value: HomeBrandSchema })
    .strict(),
  z
    .object({ key: z.literal("partners"), expectedRevision: RevisionSchema, value: PartnersSchema })
    .strict(),
  z
    .object({ key: MessageKeySchema, expectedRevision: RevisionSchema, value: MessageSchema })
    .strict(),
]);
export type WorkspacePreferenceCommand = z.infer<typeof WorkspacePreferenceCommandSchema>;
export const emptyWorkspacePreferences = (): WorkspacePreferences => ({
  brand: null,
  partners: null,
  messages: {},
});

export const messageLabels: Record<MessageKey, string> = {
  invitation_email: "Open house invitation · Email",
  invitation_sms: "Open house invitation · SMS",
  followup_email: "Buyer follow-up · Email",
  followup_sms: "Buyer follow-up · SMS",
  partner_update_email: "Partner update · Email",
  partner_update_sms: "Partner update · SMS",
};
export function starterMessage(key: MessageKey, name: string): WorkspaceMessage {
  const subject = key.startsWith("invitation")
    ? "You're invited to an open house"
    : key.startsWith("followup")
      ? "Thank you for stopping by"
      : "Our property campaign update";
  const line = key.startsWith("invitation")
    ? "Join us at [property address] on [date and time]. Details: [property link]"
    : key.startsWith("followup")
      ? "Thank you for visiting [property address]. What questions can I help answer?"
      : "Here is our update for [property address]: [add verified results and next steps].";
  return {
    subject: key.endsWith("_email") ? subject : "",
    body: `Hi [first name],${key.endsWith("_email") ? "\n\n" : " "}${line}${key.endsWith("_email") ? "\n\n" : " "}${name}`,
  };
}

export interface WorkspacePageData {
  view: WorkspaceView;
  identity: { name: string; company: string; role: string };
  canEdit: boolean;
  preferences: WorkspacePreferences;
  defaultBrand: HomeBrand;
  campaigns: {
    id: string;
    headline: string;
    address: string;
    state: string;
    href: string;
    updatedAt: string;
  }[];
  properties: {
    id: string;
    address: string;
    reportCount: number;
    updatedAt: string;
    monthly: boolean;
    paused: boolean;
  }[];
  reportsEnabled: boolean;
  valuationConfigured: boolean;
  contactConfigured: boolean;
  deliveryEnabled: boolean;
  lookupsUsed: number;
  lookupLimit: number;
}
