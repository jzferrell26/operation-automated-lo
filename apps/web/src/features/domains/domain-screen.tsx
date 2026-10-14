"use client";
import { AsyncState, Badge, Button, Card, Dialog, FormField, Link, TextField } from "@oalo/ui";
import { useEffect, useRef, useState } from "react";
import { DomainClientError, domainErrorMessage, loadDomain, writeDomain } from "./client.js";
import {
  isReadyDomain,
  normalizeFunnelDomain,
  type DomainDnsRecord,
  type DomainState,
  type DomainStatus,
} from "./model.js";
import styles from "./domains.module.css";
import { SupportReference } from "../shell/components/support-details.js";
import type { InternalRefusal } from "../http/internal-api.js";

const statuses: Record<DomainStatus, { label: string; detail: string }> = {
  ownership_needed: {
    label: "Domain control needed",
    detail: "Add the exact TXT record below in your DNS settings, then check again.",
  },
  hosting_needed: {
    label: "Hosting verification needed",
    detail:
      "Domain control was checked, but hosting is not verified yet. Follow any hosting records below, then check again.",
  },
  dns_needed: {
    label: "DNS routing needed",
    detail:
      "Add the recommended hosting records below. DNS changes can take time to appear; check again after your DNS settings have updated.",
  },
  certificate_needed: {
    label: "HTTPS pending",
    detail:
      "DNS routing was checked, but a valid HTTPS certificate has not been confirmed. Wait and check again.",
  },
  ready: {
    label: "Domain checks passed",
    detail:
      "Domain control, hosting, DNS routing and HTTPS passed the latest check. Only eligible published funnels can be served here.",
  },
  attention: {
    label: "Check needs attention",
    detail:
      "The latest checks could not be confirmed. Review your DNS records and check again. Routing stays unavailable until current proof is confirmed.",
  },
  disconnected: {
    label: "Disconnected",
    detail:
      "This domain no longer serves your funnels. A new connection requires a new ownership record.",
  },
};
function moment(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Not checked yet";
}
function DnsRecord({
  record,
  index,
  copy,
}: {
  record: DomainDnsRecord;
  index: number;
  copy: (value: string, label: string) => Promise<void>;
}) {
  return (
    <div className={styles.record}>
      <strong>
        {record.type} record {index + 1}
      </strong>
      <dl>
        <dt>Name</dt>
        <dd>{record.name}</dd>
        <dt>Value</dt>
        <dd>{record.value}</dd>
      </dl>
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copy(record.name, `record ${index + 1} name`)}
        >
          Copy name for record {index + 1}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copy(record.value, `record ${index + 1} value`)}
        >
          Copy value for record {index + 1}
        </Button>
      </div>
    </div>
  );
}
export function DomainScreen() {
  const [state, setState] = useState<DomainState | null>(null);
  const [hostname, setHostname] = useState("");
  const [apex, setApex] = useState(false);
  const [error, setError] = useState("");
  const [refusal, setRefusal] = useState<InternalRefusal | undefined>();
  const [fieldError, setFieldError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [mustReload, setMustReload] = useState(false);
  const [dialog, setDialog] = useState<"connect" | "disconnect" | null>(null);
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false);
  const active = useRef(true);
  const field = useRef<HTMLInputElement>(null);
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setRefusal(undefined);
    setNotice("");
    try {
      const current = await loadDomain();
      if (active.current) {
        setState(current);
        setMustReload(false);
        setNotice("Latest saved domain state loaded.");
      }
    } catch (failure) {
      if (active.current) {
        setError(domainErrorMessage(failure));
        setRefusal(failure instanceof DomainClientError ? failure.refusal : undefined);
        setMustReload(true);
      }
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void reload();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active.current = false;
      window.clearInterval(clock);
    };
  }, []);
  const domain = state?.domain ?? null;
  const saved = domain !== null && domain.status !== "disconnected";
  const editable = state?.canEdit === true;
  const enabled = editable && state?.available === true && !busy && !mustReload;
  const seconds = domain?.nextCheckAt
    ? Math.max(0, Math.ceil((Date.parse(domain.nextCheckAt) - now) / 1000))
    : 0;
  const ready = !mustReload && domain ? isReadyDomain(domain, now) : false;
  const stale = domain?.status === "ready" && !isReadyDomain(domain, now);
  const expiredChallenge = domain !== null && Date.parse(domain.challengeExpiresAt) <= now;
  async function execute(action: "connect" | "check" | "disconnect") {
    if (inFlight.current || !state || !editable || mustReload) return;
    if (action !== "disconnect" && !enabled) return;
    if (action === "check" && (seconds > 0 || !domain)) return;
    const normalized = normalizeFunnelDomain(hostname);
    if (action === "connect" && !normalized) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setRefusal(undefined);
    setNotice("");
    try {
      const next = await writeDomain(
        action === "connect"
          ? {
              action,
              hostname: normalized!,
              apex,
              defaultKind: domain?.defaultKind ?? "live-webinar",
              confirmed: true,
            }
          : { action, id: domain!.id, expectedRevision: domain!.revision },
      );
      if (active.current) {
        setState({ ...state, domain: next });
        setDialog(null);
        setNotice(
          action === "connect"
            ? "Connection saved. Add the ownership record to continue."
            : action === "disconnect"
              ? "Domain disconnected."
              : "Domain check finished. Review the saved status below.",
        );
      }
    } catch (failure) {
      if (active.current) {
        setError(domainErrorMessage(failure));
        setRefusal(failure instanceof DomainClientError ? failure.refusal : undefined);
        setDialog(null);
        setMustReload(true);
        if (failure instanceof DomainClientError && failure.reason === "forbidden")
          setState({ ...state, canEdit: false });
      }
    } finally {
      inFlight.current = false;
      if (active.current) {
        setBusy(false);
        setNow(Date.now());
      }
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Copied ${label}.`);
    } catch {
      setError("The clipboard is unavailable. Select and copy the record text above manually.");
    }
  }
  function connect() {
    if (!normalizeFunnelDomain(hostname)) {
      setFieldError("Enter a hostname without https://, a path or a wildcard.");
      field.current?.focus();
      return;
    }
    setFieldError("");
    setDialog("connect");
  }
  return (
    <div className={styles.screen} data-product-shell="true" data-domain-setup="true">
      <header className={styles.stack}>
        <Link href="/settings" className={styles.back}>
          Back to Settings
        </Link>
        <h1>Domains</h1>
        <p>
          Use your own address for your published funnels. A subdomain, such as
          offers.yourdomain.com, keeps your existing website and email separate.
        </p>
      </header>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => void reload()} disabled={busy}>
          Load latest saved state
        </Button>
      </div>
      {busy ? (
        <AsyncState
          kind="loading"
          surface="card"
          title="Domain settings"
          description="Loading domain settings."
        />
      ) : null}
      {error ? (
        <AsyncState
          kind="error"
          surface="card"
          title="Domain settings need attention"
          description={error}
        />
      ) : null}
      <SupportReference refusal={refusal} />
      <p role="status" aria-live="polite">
        {notice}
      </p>
      {state && !state.canEdit ? (
        <AsyncState
          kind="permission_restricted"
          surface="card"
          title="Domain settings are view-only"
          description="This session can view domain settings. Changes are unavailable here."
          reason="Your current session cannot change domain settings."
          requiredRole="Your signed-in loan officer session with access to change these settings."
          responsibleParty="Account support can help restore access for your session."
        />
      ) : null}
      {state && !state.available ? (
        <AsyncState
          kind="degraded"
          surface="card"
          title="Domain connection is unavailable"
          description="Domain management needs platform setup before you can connect or check a domain. Your saved record is shown below; disconnect remains available when this session can edit it."
        />
      ) : null}
      {state && !saved ? (
        <Card padding="lg" className={styles.stack}>
          <h2>Connect your domain</h2>
          <p className={styles.muted}>
            Use a domain you control. You will add records in your existing DNS settings.
          </p>
          <form
            className={styles.stack}
            onSubmit={(event) => {
              event.preventDefault();
              connect();
            }}
          >
            <TextField
              ref={field}
              id="domain-hostname"
              label="Domain or subdomain"
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              autoComplete="off"
              maxLength={253}
              description="Enter only the hostname, for example offers.yourdomain.com."
              error={fieldError || undefined}
              disabled={!enabled}
            />
            <FormField label="This is my root domain, without a subdomain" className={styles.check}>
              {(control) => (
                <input
                  {...control}
                  type="checkbox"
                  checked={apex}
                  onChange={(event) => setApex(event.target.checked)}
                  disabled={!enabled}
                />
              )}
            </FormField>
            <p className={styles.muted}>
              If this address already serves a website, use a separate subdomain. Connecting here
              will not update DNS or move an existing domain from another hosting project.
            </p>
            <div>
              <Button type="submit" disabled={!enabled}>
                Review connection
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      {domain ? (
        <Card padding="lg" className={styles.stack}>
          <h2>{domain.hostname}</h2>
          <div>
            <Badge
              tone={ready ? "success" : domain.status === "disconnected" ? "neutral" : "warning"}
            >
              {mustReload
                ? "Current state unconfirmed"
                : stale
                  ? "Proof expired"
                  : statuses[domain.status].label}
            </Badge>
          </div>
          <p>
            {mustReload
              ? "This is the last loaded record. Load the latest saved state before relying on its checks or repeating a change."
              : stale
                ? "The previous check has expired. Routing is unavailable until domain control and HTTPS are checked again."
                : statuses[domain.status].detail}
          </p>
          <p className={styles.muted}>
            Last checked: {moment(domain.checkedAt)}
            {domain.readyUntil ? `. Proof valid until: ${moment(domain.readyUntil)}.` : ""}
          </p>
          {expiredChallenge && !ready && saved ? (
            <p>
              Ownership proof has expired. Disconnect and reconnect to receive a new TXT record.
            </p>
          ) : null}
          {saved ? (
            <>
              <ol className={styles.steps}>
                <li className={styles.stack}>
                  <h3>Prove domain control</h3>
                  <p>
                    Keep the ownership TXT record in DNS. Copy the exact name and value; your DNS
                    settings may ask for a relative record name.
                  </p>
                  <div className={styles.records}>
                    {domain.records
                      .filter((record) => record.purpose === "ownership")
                      .map((record, index) => (
                        <DnsRecord
                          key={`${record.name}:${record.value}`}
                          record={record}
                          index={index}
                          copy={copy}
                        />
                      ))}
                  </div>
                </li>
                <li className={styles.stack}>
                  <h3>Connect DNS to hosting</h3>
                  {domain.records.some((record) => record.purpose !== "ownership") ? (
                    <div className={styles.records}>
                      {domain.records
                        .filter((record) => record.purpose !== "ownership")
                        .map((record, index) => (
                          <DnsRecord
                            key={`${record.name}:${record.value}`}
                            record={record}
                            index={index + 1}
                            copy={copy}
                          />
                        ))}
                    </div>
                  ) : (
                    <p>
                      Recommended hosting records will appear after domain control is confirmed. Use
                      the records shown here, rather than a generic CNAME.
                    </p>
                  )}
                </li>
                <li className={styles.stack}>
                  <h3>Verify HTTPS</h3>
                  <p>
                    {ready
                      ? "HTTPS passed the latest check."
                      : "HTTPS has not been confirmed with current proof. Check again after DNS is in place."}
                  </p>
                </li>
              </ol>
              {seconds > 0 ? (
                <p role="status">You can check again in {seconds} seconds.</p>
              ) : (
                <p className={styles.muted}>
                  DNS and certificates may take time to update. A check does not promise immediate
                  activation.
                </p>
              )}
              <div className={styles.actions}>
                <Button
                  disabled={!enabled || seconds > 0 || expiredChallenge}
                  onClick={() => void execute("check")}
                >
                  Check domain
                </Button>
                <Button
                  variant="outline"
                  disabled={!editable || busy || mustReload}
                  onClick={() => setDialog("disconnect")}
                >
                  Disconnect domain
                </Button>
              </div>
            </>
          ) : null}
          <Link href="/marketing/campaigns/funnels" variant="action">
            Review your published funnels
          </Link>
          <p className={styles.muted}>
            Connecting a domain does not publish a funnel. Open each eligible published funnel from
            Campaigns. The domain home address is not enabled by this setup.
          </p>
        </Card>
      ) : null}
      <Dialog
        open={dialog !== null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title={dialog === "disconnect" ? "Disconnect this domain?" : "Connect this domain?"}
        description={
          dialog === "disconnect" ? domain?.hostname : (normalizeFunnelDomain(hostname) ?? "")
        }
        footer={
          <div className={styles.actions}>
            <Button
              disabled={busy}
              onClick={() => void execute(dialog === "disconnect" ? "disconnect" : "connect")}
            >
              {dialog === "disconnect" ? "Confirm disconnect" : "Confirm connection"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setDialog(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        <p>
          {dialog === "disconnect"
            ? "This stops serving your funnels on this domain. It does not change DNS or your existing platform-hosted publication links. A later connection needs new proof of control."
            : "Save this hostname and start domain verification. After proof of control, checking can attach it to Automated LO hosting. No domain is purchased, transferred or changed in your DNS account."}
        </p>
      </Dialog>
    </div>
  );
}
