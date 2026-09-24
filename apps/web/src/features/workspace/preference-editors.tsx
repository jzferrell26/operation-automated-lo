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
import { HomeBrandFields } from "../homeowners/builder.js";
import {
  messageKeys,
  messageLabels,
  starterMessage,
  MessageKeySchema,
  MessageSchema,
  PartnerSchema,
  type MessageKey,
  type WorkspacePageData,
  type WorkspacePartner,
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
            <p>
              Saved for your account in this workspace and used when you create a new homeowner
              report.
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
          <Feedback error={validation || state.error} message={state.message} />
          <div className={styles.actions}>
            <Button type="submit" disabled={!data.canEdit || state.busy}>
              {state.busy ? "Saving…" : "Save report branding"}
            </Button>
            <Button
              variant="outline"
              disabled={state.busy}
              onClick={() => {
                void state.reload().then((next) => {
                  if (next) setBrand(next.brand?.value ?? data.defaultBrand);
                });
              }}
            >
              Load latest saved details
            </Button>
          </div>
          {!data.canEdit ? (
            <p className={styles.note}>Your role has read-only access to these details.</p>
          ) : null}
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

export function MessageDraftEditor({ data }: { data: WorkspacePageData }) {
  const state = useWorkspacePreferences(data.preferences);
  const [key, setKey] = useState<MessageKey>(messageKeys[0]);
  const [draft, setDraft] = useState(
    state.preferences.messages[key]?.value ?? starterMessage(key, data.identity.name),
  );
  const [validation, setValidation] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingKey, setPendingKey] = useState<typeof key | null>(null);
  function select(next: typeof key) {
    state.clearFeedback();
    setKey(next);
    setDraft(state.preferences.messages[next]?.value ?? starterMessage(next, data.identity.name));
    setDirty(false);
    setValidation("");
    setCopyStatus("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = MessageSchema.safeParse(draft);
    if (!parsed.success) {
      setValidation("Add message text before saving.");
      return;
    }
    setValidation("");
    const saved = await state.save({
      key,
      expectedRevision: state.preferences.messages[key]?.revision ?? null,
      value: parsed.data,
    });
    if (saved) {
      setDraft(saved.messages[key]?.value ?? parsed.data);
      setCopyStatus("");
      setDirty(false);
    }
  }
  async function copyDraft() {
    setCopyStatus("");
    try {
      await navigator.clipboard.writeText(
        `${key.endsWith("_email") && draft.subject ? `Subject: ${draft.subject}\n\n` : ""}${draft.body}`,
      );
      setCopyStatus("Draft copied. No message was sent.");
    } catch {
      setCopyStatus("Clipboard access is unavailable. Select the message text to copy it.");
    }
  }
  function edited() {
    state.clearFeedback();
    setValidation("");
    setCopyStatus("");
    setDirty(true);
  }
  return (
    <div className={styles.columns}>
      <Card padding="lg" className={styles.panel}>
        <form className={styles.stack} onSubmit={(event) => void submit(event)}>
          <Select
            label="Message draft"
            disabled={state.busy}
            value={key}
            options={messageKeys.map((value) => ({ value, label: messageLabels[value] }))}
            onValueChange={(value) => {
              const next = MessageKeySchema.parse(value);
              if (next === key) return;
              if (dirty) setPendingKey(next);
              else select(next);
            }}
          />
          <p className={styles.note}>
            Starter wording is a draft. Replace the bracketed fields and review contact permission
            before using it in HighLevel.
          </p>
          {key.endsWith("_email") ? (
            <TextField
              label="Email subject"
              disabled={state.busy || !data.canEdit}
              value={draft.subject}
              maxLength={160}
              onChange={(event) => {
                setDraft({ ...draft, subject: event.target.value });
                edited();
              }}
            />
          ) : null}
          <TextArea
            label="Message text"
            disabled={state.busy || !data.canEdit}
            value={draft.body}
            maxLength={2500}
            rows={10}
            requirement="required"
            onChange={(event) => {
              setDraft({ ...draft, body: event.target.value });
              edited();
            }}
          />
          <small>{draft.body.length.toLocaleString()} / 2,500 characters</small>
          <Feedback error={validation || state.error} message={copyStatus || state.message} />
          <div className={styles.actions}>
            <Button type="submit" disabled={!data.canEdit || state.busy}>
              {state.busy ? "Saving…" : "Save message draft"}
            </Button>
            <Button
              variant="outline"
              disabled={!draft.body.trim()}
              onClick={() => void copyDraft()}
            >
              Copy draft
            </Button>
            <Button
              variant="ghost"
              disabled={state.busy}
              onClick={() => {
                void state.reload().then((next) => {
                  if (next) {
                    setDraft(next.messages[key]?.value ?? starterMessage(key, data.identity.name));
                    setDirty(false);
                    setValidation("");
                    setCopyStatus("");
                  }
                });
              }}
            >
              Load latest saved details
            </Button>
          </div>
        </form>
      </Card>
      <Card padding="lg" className={styles.panel}>
        <Icon name="file-text" decorative size="lg" />
        <h2>Prepared here. Reviewed in HighLevel.</h2>
        <p>
          Your email and SMS drafts are stored separately, so editing one channel keeps the other
          intact.
        </p>
        <p>
          Saving and copying do not send messages, add contacts, or start workflows. Use the
          approved messaging workflow in your HighLevel account.
        </p>
        <Link href="/settings/connections" variant="action">
          Review workspace connections
        </Link>
      </Card>
      <Dialog
        title="Discard unsaved draft changes?"
        open={pendingKey !== null}
        onClose={() => setPendingKey(null)}
      >
        <p>Your current edits have not been saved. Switching drafts will discard them.</p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setPendingKey(null)}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              if (pendingKey) select(pendingKey);
              setPendingKey(null);
            }}
          >
            Discard edits and switch
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
