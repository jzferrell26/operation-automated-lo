"use client";
import { Button, Dialog, FormField, Icon, Link } from "@oalo/ui";
import { useState } from "react";
import { z } from "zod";
import type { FunnelFields, FunnelKind } from "./model.js";
import {
  FunnelPublicationStateSchema,
  PublishedFunnelSchema,
  publicationBlockers,
} from "./publication-model.js";
import { postInternalJson } from "../http/internal-api.js";
import styles from "./studio.module.css";

export function FunnelPublishPanel({
  kind,
  fields,
  revision,
  dirty,
  canSave,
}: Readonly<{
  kind: FunnelKind;
  fields: FunnelFields;
  revision: string | null;
  dirty: boolean;
  canSave: boolean;
}>) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [problem, setProblem] = useState("");
  const [state, setState] = useState<z.infer<typeof FunnelPublicationStateSchema> | null>(null);
  const [publishedUrl, setPublishedUrl] = useState("");
  const blockers = publicationBlockers(kind, fields);
  async function load() {
    setOpen(true);
    setBusy(true);
    setProblem("");
    try {
      const response = await fetch("/api/funnels/publication", {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) throw new Error("Read failed");
      setState(FunnelPublicationStateSchema.parse(await response.json()));
    } catch {
      setProblem("Publishing details could not be loaded. Your saved edits are unchanged.");
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!reviewed || !revision || dirty || busy || blockers.length || !state?.available) return;
    setBusy(true);
    setProblem("");
    try {
      const response = await postInternalJson("/api/funnels/publication", {
        kind,
        expectedRevision: revision,
        reviewed: true,
      });
      if (!response.ok) throw new Error("Publish failed");
      const result = z
        .object({ publication: PublishedFunnelSchema, url: z.url() })
        .parse(await response.json());
      setPublishedUrl(new URL(`/f/${result.publication.id}`, window.location.origin).href);
      setReviewed(false);
      await load();
    } catch {
      setProblem(
        "Publication could not be confirmed. Check the links below before trying again; your saved funnel is safe.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setBusy(true);
    setProblem("");
    try {
      const response = await postInternalJson("/api/funnels/publication", { id, action: "revoke" });
      if (!response.ok) throw new Error("Not revoked");
      if (publishedUrl.endsWith(id)) setPublishedUrl("");
      await load();
    } catch {
      setProblem("The page could not be taken offline. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={!canSave || dirty || !revision}
        onClick={() => void load()}
      >
        <Icon decorative name="globe" size="sm" />
        Review and publish
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Put your funnel to work"
        description="Publish a saved, reviewed version. Later edits stay private until you publish a new version."
      >
        <div className={styles.publishContent}>
          {busy ? <p role="status">Checking your publication…</p> : null}
          {problem ? <p role="alert">{problem}</p> : null}
          {state ? <p>{state.message}</p> : null}
          {blockers.length ? (
            <div>
              <strong>Finish these details first</strong>
              <ul>
                {blockers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {state?.available && !state.handoffConfigured ? (
            <p>
              Requests are stored securely for this funnel. HighLevel delivery is not connected yet;
              download your inquiries below. No automated messages are sent.
            </p>
          ) : null}
          <FormField label="I reviewed the full page, lender information, policies, media permissions and destination links for public use.">
            {(control) => (
              <input
                {...control}
                type="checkbox"
                checked={reviewed}
                disabled={busy || !state?.available}
                onChange={(event) => setReviewed(event.currentTarget.checked)}
              />
            )}
          </FormField>
          <Button
            type="button"
            disabled={!reviewed || busy || !!blockers.length || !state?.available}
            onClick={() => void publish()}
          >
            Publish reviewed version
            <Icon decorative name="arrow-right" size="sm" />
          </Button>
          {publishedUrl ? (
            <p>
              <strong>Published page</strong>
              <br />
              <Link external href={publishedUrl}>
                {publishedUrl}
              </Link>
            </p>
          ) : null}
          {state?.publications
            .filter((item) => item.kind === kind)
            .map((item) => (
              <div className={styles.publishedRow} key={item.id}>
                <div>
                  <strong>{item.active ? "Published" : "Offline"}</strong>
                  <span>Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                </div>
                <div>
                  {item.active ? (
                    <>
                      <Link external href={`/f/${item.id}`}>
                        Open public page
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void revoke(item.id)}
                      >
                        Take offline
                      </Button>
                    </>
                  ) : null}
                  <Link href={`/api/funnels/submissions?publication=${item.id}`} external>
                    Download inquiries
                  </Link>
                </div>
              </div>
            ))}
          <p className={styles.fieldNote}>
            Published links last up to 90 days. Inquiries are available for 30 days. Registration
            does not create a Zoom attendee record or confirm a calendar booking; the published page
            delivers the event or resource details you supplied.
          </p>
        </div>
      </Dialog>
    </>
  );
}
