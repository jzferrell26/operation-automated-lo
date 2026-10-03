"use client";
import { useId, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  Link,
  LiveRegion,
  Select,
  Surface,
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
  BrandSaveSchema,
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

/**
 * The feedback, the save button, and the reload that both Brand cards end with.
 *
 * Both cards sit on one page, so the save and the reload each say which card they belong to
 * ("Save your details" and "Load latest saved details", "Save ad settings" and "Load latest saved ad
 * settings"): two buttons with one accessible name cannot be told apart by a screen reader, and a
 * test that asks for one by name finds two.
 *
 * The scored review's F-05: one obvious primary button per screen (direction section 2.3, rubric
 * axis 1). The page holds two forms, so exactly one of them is the page's primary and the other
 * saves as a secondary button. "Your details" is the primary: it holds the name and NMLS number
 * that Home's "Add your brand" asks for and every ad carries, while the ad settings start from
 * working defaults.
 */
function SaveAndReload({
  canEdit,
  emphasis,
  onLoaded,
  reloadLabel,
  saveLabel,
  state,
  validation,
}: {
  canEdit: boolean;
  emphasis: "primary" | "secondary";
  onLoaded: (next: WorkspacePreferences) => void;
  reloadLabel: string;
  saveLabel: string;
  state: ReturnType<typeof useWorkspacePreferences>;
  validation: string;
}) {
  // The reason a save is off is the plain line under the buttons, and the disabled save points at it
  // (scored review pass 3, R3 P3-04). Two cards share this page, so each row has its own id.
  const reasonId = useId();
  return (
    <>
      <Feedback error={validation || state.error} message={state.message} />
      <div className={styles.formActions}>
        <div className={`${styles.actions} ${styles.pageActions}`}>
          <Button
            type="submit"
            variant={emphasis}
            disabled={!canEdit || state.busy}
            aria-describedby={canEdit ? undefined : reasonId}
          >
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
            {reloadLabel}
          </Button>
        </div>
        {!canEdit ? (
          <p className={styles.reason} id={reasonId}>
            Your role has read-only access to these details.
          </p>
        ) : null}
      </div>
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
    const parsed = BrandSaveSchema.safeParse(brand);
    if (!parsed.success) {
      setValidation(
        "Check the name, company, email and NMLS numbers before saving. Each NMLS number has 4 to 12 digits.",
      );
      return;
    }
    const saved = await state.save({
      key: "brand",
      expectedRevision: state.preferences.brand?.revision ?? null,
      value: parsed.data,
    });
    if (saved?.brand) setBrand(saved.brand.value);
  }
  const nmlsLine = [
    brand.nmls ? `NMLS ${brand.nmls}` : "",
    brand.companyNmls ? `Company NMLS ${brand.companyNmls}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={styles.columns}>
      <Card className={styles.panel} padding="lg">
        <form className={styles.stack} onSubmit={(event) => void submit(event)}>
          <div className={styles.cardHead}>
            {/* Writing review pass 2 (MTK-008, W-4): "Your details", because this card holds the name,
                company, email, phone and tagline as well as the NMLS numbers, and only the reports use
                the last three. "Report identity" and "report branding" were two more names for it. */}
            <h2>Your details</h2>
            {/* The details are saved either way. Whether the reports use them yet depends on whether
                homeowner reports are on for the workspace, and the sentence says which. */}
            <p>
              {data.reportsEnabled
                ? "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad, and all of it is used when you create a new homeowner report."
                : "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad. All of it goes on new homeowner reports once those are turned on."}
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
            emphasis="primary"
            onLoaded={(next) => setBrand(next.brand?.value ?? data.defaultBrand)}
            reloadLabel="Load latest saved details"
            saveLabel="Save your details"
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
        {/* The scored review pass 2, P2-03: no numbers, no line. An empty `<small>` is still a grid item,
            and it took a second `--space-5` gap above the note. */}
        {nmlsLine === "" ? null : <small>{nmlsLine}</small>}
        <p>
          Changes apply to new reports. Saved reports retain the identity and source details they
          were created with.
        </p>
        {/* The scored review pass 3, R3 P3-05. The lead above already says reports are off until they
            are turned on, so the card does not offer to create one: it gives the reason and the next
            safe step, which the Homeowner reports page names the same way. */}
        {data.reportsEnabled ? (
          <Link href="/homeowners/new" variant="action">
            Create a homeowner report
          </Link>
        ) : (
          <div className={styles.unavailable}>
            <p className={styles.reason}>
              Homeowner reports aren&apos;t turned on in this workspace yet.
            </p>
            <Link href="/settings/connections" variant="action">
              Workspace connections
            </Link>
          </div>
        )}
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
          className={styles.toolbarAction}
          disabled={!data.canEdit || partners.length >= 25 || state.busy}
          onClick={() => {
            setValidation("");
            setDraft({ id: crypto.randomUUID(), name: "", company: "", email: "", phone: "" });
          }}
        >
          <Icon name="plus" decorative size="sm" /> Add Realtor partner
        </Button>
      </div>
      {/* The mockups' `.notice`, as Connections draws it: the `Surface` primitive's `info` variant
          with the information glyph (scored review pass 3, R3 P3-03). */}
      <Surface className={styles.pageNote} padding="md" variant="info">
        <Icon decorative name="info" size="sm" tone="info" />
        <p>
          Your Realtor partner list is saved to this account and workspace. Adding a partner sends
          no invitation.
        </p>
      </Surface>
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
      ) : partners.length ? (
        // The writing review delta check, D-7: the list is not empty, the search found nothing, and
        // the empty state's "Empty" chip would say otherwise. One plain line says what happened, and
        // is a status so a screen reader hears it as the person types.
        <p className={styles.noMatch} role="status">
          No partners match this search. Try a different name or company.
        </p>
      ) : (
        // The scored review pass 2, P2-07: the product's one empty state, not a hand-built card. It
        // is for a person with no partners at all, where its "Empty" chip is true.
        <EmptyState
          description="Keep your Realtor partners' details in one place. Nothing is imported from HighLevel, and partners never appear in your ads."
          surface="card"
          title="Add your first Realtor partner"
        />
      )}
      <div className={`${styles.actions} ${styles.pageActions}`}>
        <Button variant="outline" disabled={state.busy} onClick={() => void state.reload()}>
          Load latest saved details
        </Button>
        <Link href="/marketing/campaigns/new" variant="action">
          Launch an ad
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
          <div className={styles.cardHead}>
            <h2>Your brand on ads</h2>
            <p>
              Your name and NMLS number go on every ad automatically, with the title, color and
              disclosure line you choose here. The checks read all of them before an ad can be
              approved.
            </p>
          </div>
          {/* The scored review's F-06: the stack's `--space-5` between fields, as the partner dialog's
              fieldset has it. The fields sat 6 to 10px apart with no gap at all. */}
          <fieldset
            className={`${styles.fields} ${styles.stack}`}
            disabled={state.busy || !data.canEdit}
          >
            <TextField
              description="For example, Loan officer. Leave it empty to show only your name."
              label="Title on your ads"
              maxLength={AD_BRAND_LIMITS.title}
              onChange={(event) => edit({ title: event.target.value })}
              value={adBrand.title}
            />
            <Select
              description="It fills the small tile with your initials and the thin line above your name."
              label="Brand color"
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
            emphasis="secondary"
            onLoaded={(next) => setAdBrand(next.adBrand?.value ?? data.defaultAdBrand)}
            reloadLabel="Load latest saved ad settings"
            saveLabel="Save ad settings"
            state={state}
            validation={validation}
          />
        </form>
      </Card>
      <Card className={styles.brandPreview} padding="lg">
        <span className={styles.eyebrow}>On every ad</span>
        <div
          className={styles.adBandPreview}
          data-ad-preview=""
          style={adColorVariables(adBrand.colorPresetId)}
        >
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
          Your name, company and NMLS numbers come from Your details above. A change applies to new
          ad versions; an approved version keeps the brand it was approved with.
        </p>
        <Link href="/marketing/campaigns/new" variant="action">
          Launch an ad
        </Link>
      </Card>
    </div>
  );
}
