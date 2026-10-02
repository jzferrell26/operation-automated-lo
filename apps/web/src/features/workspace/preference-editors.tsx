"use client";
import { useState, type FormEvent } from "react";
import { HomeBrandSchema } from "@oalo/contracts";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Link,
  LiveRegion,
  Select,
  TextArea,
  TextField,
} from "@oalo/ui";
import { adColorVariables } from "../campaigns/components/ad-creative.js";
import { BrandBand } from "../campaigns/components/brand-band.js";
import { HomeBrandFields } from "../homeowners/builder.js";
import {
  AD_BRAND_COLOR_PRESETS,
  AD_BRAND_LIMITS,
  AdBrandSchema,
  type AdBrand,
} from "./ad-brand.js";
import {
  PartnerSchema,
  type WorkspacePageData,
  type WorkspacePartner,
  type WorkspacePreferences,
} from "./model.js";
import { useWorkspacePreferences } from "./use-workspace-preferences.js";
import styles from "./workspace.module.css";

function Feedback({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error ? (
        <LiveRegion urgency="alert" visible message={error} />
      ) : message ? (
        <LiveRegion visible message={message} />
      ) : null}
    </>
  );
}

/** The feedback, the save button, and the reload that both Brand cards end with. */
function SaveAndReload({
  canEdit,
  onLoaded,
  saveLabel,
  state,
  validation,
}: {
  canEdit: boolean;
  onLoaded: (next: WorkspacePreferences) => void;
  saveLabel: string;
  state: ReturnType<typeof useWorkspacePreferences>;
  validation: string;
}) {
  return (
    <>
      <Feedback error={validation || state.error} message={state.message} />
      <div className={styles.actions}>
        <Button type="submit" disabled={!canEdit || state.busy}>
          {state.busy ? "Saving…" : saveLabel}
        </Button>
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => {
            void state.reload().then((next) => {
              if (next) onLoaded(next);
            });
          }}
        >
          Load latest saved details
        </Button>
      </div>
      {!canEdit ? (
        <p className={styles.note}>Your role has read-only access to these details.</p>
      ) : null}
    </>
  );
}

export function ReportBrandEditor({ data }: { data: WorkspacePageData }) {
  const state = useWorkspacePreferences(data.preferences);
  const [brand, setBrand] = useState(data.defaultBrand);
  const [validation, setValidation] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    const parsed = HomeBrandSchema.safeParse(brand);
    if (!parsed.success) {
      setValidation("Check the name, company, email and license numbers before saving.");
      return;
    }
    const saved = await state.save({
      key: "brand",
      expectedRevision: state.preferences.brand?.revision ?? null,
      value: parsed.data,
    });
    if (saved?.brand) setBrand(saved.brand.value);
  }
  return (
    <div className={styles.columns}>
      <Card className={styles.panel} padding="lg">
        <form className={styles.stack} onSubmit={(event) => void submit(event)}>
          <div>
            <h2>Your report identity</h2>
            {/* The branding is saved either way. Whether anything uses it yet depends on whether
                homeowner reports are on for the workspace, and the sentence says which. */}
            <p>
              {data.reportsEnabled
                ? "Saved for your account in this workspace and used when you create a new homeowner report."
                : "Saved for your account in this workspace. It will be used on a new homeowner report once homeowner reports are turned on."}
            </p>
          </div>
          <fieldset className={styles.fields} disabled={state.busy || !data.canEdit}>
            <HomeBrandFields
              value={brand}
              onChange={(next) => {
                setBrand(next);
                state.clearFeedback();
                setValidation("");
              }}
            />
          </fieldset>
          <SaveAndReload
            canEdit={data.canEdit}
            onLoaded={(next) => setBrand(next.brand?.value ?? data.defaultBrand)}
            saveLabel="Save report branding"
            state={state}
            validation={validation}
          />
        </form>
      </Card>
      <Card className={styles.brandPreview} padding="lg">
        <span className={styles.eyebrow}>Report preview</span>
        <Icon name="home" decorative size="lg" />
        <h2>{brand.company || "Your company"}</h2>
        <p>{brand.tagline || "Your home. Your next chapter."}</p>
        <div className={styles.rule} />
        <strong>{brand.name || "Your name"}</strong>
        <span>
          {[brand.email, brand.phone].filter(Boolean).join(" · ") || "Your contact details"}
        </span>
        <small>
          {[
            brand.nmls ? `NMLS ${brand.nmls}` : "",
            brand.companyNmls ? `Company NMLS ${brand.companyNmls}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
        <p>
          Changes apply to new reports. Saved reports retain the identity and source details they
          were created with.
        </p>
        <Link href="/homeowners/new" variant="action">
          Create a homeowner report
        </Link>
      </Card>
    </div>
  );
}

export function PartnersEditor({ data }: { data: WorkspacePageData }) {
  const state = useWorkspacePreferences(data.preferences);
  const [draft, setDraft] = useState<WorkspacePartner | null>(null);
  const [removing, setRemoving] = useState<WorkspacePartner | null>(null);
  const [query, setQuery] = useState("");
  const [validation, setValidation] = useState("");
  const partners = state.preferences.partners?.value.items ?? [];
  const filtered = partners.filter((partner) =>
    `${partner.name} ${partner.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    const parsed = PartnerSchema.safeParse(draft);
    if (!parsed.success) {
      setValidation("Enter a partner name, company and valid contact details.");
      return;
    }
    const next = partners.some((item) => item.id === parsed.data.id)
      ? partners.map((item) => (item.id === parsed.data.id ? parsed.data : item))
      : [...partners, parsed.data];
    if (
      await state.save({
        key: "partners",
        expectedRevision: state.preferences.partners?.revision ?? null,
        value: { items: next },
      })
    )
      setDraft(null);
  }
  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <TextField
          label="Search your Realtor partners"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or company"
        />
        <Button
          disabled={!data.canEdit || partners.length >= 25 || state.busy}
          onClick={() => {
            setValidation("");
            setDraft({ id: crypto.randomUUID(), name: "", company: "", email: "", phone: "" });
          }}
        >
          <Icon name="plus" decorative size="sm" /> Add Realtor partner
        </Button>
      </div>
      <p className={styles.note}>
        Your personal partner list is saved to this account and workspace. Adding a partner sends no
        invitation and does not confirm permission to use their materials.
      </p>
      <Feedback error={state.error} message={state.message} />
      {filtered.length ? (
        <div className={styles.cards}>
          {filtered.map((partner) => (
            <Card key={partner.id} className={styles.panel} padding="lg">
              <span className={styles.avatar}>
                {partner.name
                  .split(/\s+/u)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </span>
              <h2>{partner.name}</h2>
              <p>{partner.company}</p>
              <p className={styles.wrap}>
                {[partner.email, partner.phone].filter(Boolean).join(" · ")}
              </p>
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  aria-label={`Edit ${partner.name}`}
                  disabled={!data.canEdit || state.busy}
                  onClick={() => {
                    setValidation("");
                    setDraft(partner);
                  }}
                >
                  Edit partner
                </Button>
                <Button
                  variant="ghost"
                  disabled={!data.canEdit || state.busy}
                  onClick={() => setRemoving(partner)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={styles.empty} padding="lg">
          <Icon name="users" decorative size="lg" />
          <h2>
            {partners.length ? "No partners match this search" : "Add your first Realtor partner"}
          </h2>
          <p>
            {partners.length
              ? "Try a different name or company."
              : "Keep your partner's details ready for the next campaign. Nothing is imported from HighLevel."}
          </p>
        </Card>
      )}
      <div className={styles.actions}>
        <Button variant="outline" disabled={state.busy} onClick={() => void state.reload()}>
          Load latest saved details
        </Button>
        <Link href="/marketing/campaigns/new" variant="action">
          Create a campaign
        </Link>
      </div>
      <Dialog
        title={
          draft
            ? `Partner details${partners.some((item) => item.id === draft.id) ? "" : " · New partner"}`
            : "Partner details"
        }
        open={draft !== null}
        onClose={() => {
          if (!state.busy) setDraft(null);
        }}
      >
        {draft ? (
          <form className={styles.stack} onSubmit={(event) => void submit(event)}>
            <fieldset className={`${styles.fields} ${styles.stack}`} disabled={state.busy}>
              <TextField
                label="Partner name"
                value={draft.name}
                maxLength={120}
                requirement="required"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <TextField
                label="Brokerage or company"
                value={draft.company}
                maxLength={160}
                requirement="required"
                onChange={(event) => setDraft({ ...draft, company: event.target.value })}
              />
              <TextField
                label="Partner email"
                type="email"
                value={draft.email}
                maxLength={200}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
              <TextField
                label="Partner phone"
                value={draft.phone}
                maxLength={40}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </fieldset>
            <Feedback error={validation || state.error} message="" />
            <Button type="submit" disabled={state.busy}>
              Save partner
            </Button>
            {state.error ? (
              <Button variant="outline" disabled={state.busy} onClick={() => void state.reload()}>
                Load latest partner list and keep these edits
              </Button>
            ) : null}
          </form>
        ) : null}
      </Dialog>
      <Dialog
        title="Remove this partner?"
        open={removing !== null}
        onClose={() => {
          if (!state.busy) setRemoving(null);
        }}
      >
        <p>
          Remove {removing?.name} from your saved partner list? Existing campaigns and the HighLevel
          contact remain unchanged.
        </p>
        <Feedback error={state.error} message="" />
        <Button
          disabled={state.busy}
          onClick={() => {
            if (removing)
              void state
                .save({
                  key: "partners",
                  expectedRevision: state.preferences.partners?.revision ?? null,
                  value: { items: partners.filter((item) => item.id !== removing.id) },
                })
                .then((result) => {
                  if (result) setRemoving(null);
                });
          }}
        >
          Confirm removal
        </Button>
      </Dialog>
    </div>
  );
}

/**
 * PRD-009d D3 and 009D-AC-003. The four Brand fields a library ad's band needs beyond the report
 * identity: a title, the brand colour, the disclosure line, and the lead form wording. They are
 * saved beside the report brand under their own key, and the save of a campaign version reads them
 * here, on the server, never from the request (009D-AC-024).
 */
export function AdBrandEditor({ data }: { data: WorkspacePageData }) {
  const state = useWorkspacePreferences(data.preferences);
  const [adBrand, setAdBrand] = useState<AdBrand>(data.defaultAdBrand);
  const [validation, setValidation] = useState("");
  const brand = state.preferences.brand?.value ?? data.defaultBrand;
  function edit(change: Partial<AdBrand>) {
    setAdBrand({ ...adBrand, ...change });
    state.clearFeedback();
    setValidation("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    const parsed = AdBrandSchema.safeParse(adBrand);
    if (!parsed.success) {
      setValidation(
        "Check the title, the disclosure line and the lead form wording before saving. The disclosure line and the lead form wording can't be empty.",
      );
      return;
    }
    const saved = await state.save({
      key: "ad_brand",
      expectedRevision: state.preferences.adBrand?.revision ?? null,
      value: parsed.data,
    });
    if (saved?.adBrand) setAdBrand(saved.adBrand.value);
  }
  return (
    <div className={styles.columns}>
      <Card className={styles.panel} padding="lg">
        <form className={styles.stack} onSubmit={(event) => void submit(event)}>
          <div>
            <h2>Your brand on ads</h2>
            <p>
              Your name and NMLS number go on every ad automatically, with the title, colour and
              disclosure line you choose here. The checks read all of them before an ad can be
              approved.
            </p>
          </div>
          <fieldset className={styles.fields} disabled={state.busy || !data.canEdit}>
            <TextField
              description="For example, Loan officer. Leave it empty to show only your name."
              label="Title on your ads"
              maxLength={AD_BRAND_LIMITS.title}
              onChange={(event) => edit({ title: event.target.value })}
              value={adBrand.title}
            />
            <Select
              description="It fills the small tile with your initials and the thin line above your name."
              label="Brand colour"
              onValueChange={(value) => {
                const preset = AD_BRAND_COLOR_PRESETS.find((item) => item.id === value);
                if (preset) edit({ colorPresetId: preset.id });
              }}
              options={AD_BRAND_COLOR_PRESETS.map((preset) => ({
                value: preset.id,
                label: preset.label,
              }))}
              value={adBrand.colorPresetId}
            />
            <TextField
              description="Your lender-approved line, printed along the bottom of every ad."
              label="Disclosure line"
              maxLength={AD_BRAND_LIMITS.disclosureLine}
              onChange={(event) => edit({ disclosureLine: event.target.value })}
              requirement="required"
              value={adBrand.disclosureLine}
            />
            <TextArea
              description="What a person agrees to when they send you their details from an ad."
              label="Lead form wording"
              maxLength={AD_BRAND_LIMITS.leadFormWording}
              onChange={(event) => edit({ leadFormWording: event.target.value })}
              requirement="required"
              rows={3}
              value={adBrand.leadFormWording}
            />
          </fieldset>
          <SaveAndReload
            canEdit={data.canEdit}
            onLoaded={(next) => setAdBrand(next.adBrand?.value ?? data.defaultAdBrand)}
            saveLabel="Save ad brand"
            state={state}
            validation={validation}
          />
        </form>
      </Card>
      <Card className={styles.brandPreview} padding="lg">
        <span className={styles.eyebrow}>On every ad</span>
        <div className={styles.adBandPreview} style={adColorVariables(adBrand.colorPresetId)}>
          <BrandBand
            advertiser={{
              name: brand.name,
              title: adBrand.title,
              company: brand.company,
              nmls: brand.nmls,
              companyNmls: brand.companyNmls,
              colorPresetId: adBrand.colorPresetId,
              disclosureLine: adBrand.disclosureLine,
            }}
          />
        </div>
        <p>
          Your name, company and NMLS numbers come from your report identity. A change applies to
          new ad versions; an approved version keeps the brand it was approved with.
        </p>
        <Link href="/marketing/campaigns/new" variant="action">
          Launch an ad
        </Link>
      </Card>
    </div>
  );
}
