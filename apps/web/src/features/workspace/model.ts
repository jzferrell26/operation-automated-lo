import { z } from "zod";
import { HomeBrandSchema, type HomeBrand } from "@oalo/contracts";
import { AdBrandSchema, type AdBrand } from "./ad-brand.js";

/**
 * The addresses the catch-all serves in review mode. PRD-009f D1: the Marketing Suite hub and its
 * five sub-pages, Leads and Pipeline, Automations, Workspace tools, the report branding address,
 * and Workspace access are no longer here. Each answers a redirect or the gone page instead
 * (`apps/web/next.config.ts`, `apps/web/src/app/(gone)`), and a key left in this table would be a
 * page that no longer exists.
 */
export const workspaceRoutes = {
  "/partners": "partners",
  "/settings": "settings",
  "/settings/routing": "routing",
  "/settings/billing": "billing",
} as const;
/**
 * `profile` is the one view with no address in this table: `/brand` renders it
 * (`apps/web/src/app/(authenticated)/brand/page.tsx`), and `/settings/profile` redirects there.
 */
export type WorkspaceView = (typeof workspaceRoutes)[keyof typeof workspaceRoutes] | "profile";

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
/**
 * `ad_brand` is stored as `workspace.ad_brand.v1` (PRD-009d D3), which satisfies the preference key
 * check `^[a-z][a-z0-9_.]{1,63}$` (`supabase/migrations/20260919160000_user_preferences.sql:43`).
 * Saved message drafts stay readable; nothing in the product edits them any more.
 */
export const PreferenceKeySchema = z.enum(["brand", "ad_brand", "partners", ...messageKeys]);
export type PreferenceKey = z.infer<typeof PreferenceKeySchema>;
export const versioned = <S extends z.ZodType>(schema: S) =>
  z.object({ revision: z.uuid(), value: schema }).strict();
export const WorkspacePreferencesSchema = z
  .object({
    brand: versioned(HomeBrandSchema).nullable(),
    adBrand: versioned(AdBrandSchema).nullable(),
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
    .object({ key: z.literal("ad_brand"), expectedRevision: RevisionSchema, value: AdBrandSchema })
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
  adBrand: null,
  partners: null,
  messages: {},
});

export interface WorkspacePageData {
  view: WorkspaceView;
  identity: { name: string; company: string; role: string };
  canEdit: boolean;
  preferences: WorkspacePreferences;
  defaultBrand: HomeBrand;
  /** PRD-009d D3. The saved ad brand, or the defaults a person starts from. */
  defaultAdBrand: AdBrand;
  reportsEnabled: boolean;
  valuationConfigured: boolean;
  contactConfigured: boolean;
  deliveryEnabled: boolean;
  lookupsUsed: number;
  lookupLimit: number;
}
