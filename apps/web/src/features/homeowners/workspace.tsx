"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation.js";
import type { HomeBrand, HomeProperty } from "@oalo/contracts";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  Link,
  LiveRegion,
  Select,
  TextField,
} from "@oalo/ui";
import { useDashboardPreview } from "../dashboard-preview/preview-provider.js";
import {
  ActionLink,
  Badge,
  PageHeader,
  StatCards,
} from "../dashboard-preview/product-components.js";
import { HomeReportBuilder, HomeBrandFields } from "./builder.js";
import { blankHomeBrand, homeAddressText, homeDate, homeMoney } from "./model.js";
import { MortgageFields, mortgageDraft, mortgageFromDraft } from "./mortgage-fields.js";
import { HomeReportView } from "./report-view.js";
import { useHomeWorkspace, type HomeAction } from "./use-home-workspace.js";
import "@oalo/ui/product-tokens.css";
import styles from "./homeowners.module.css";

function HomeReportList({ data }: { data: ReturnType<typeof useHomeWorkspace> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All properties");
  const [help, setHelp] = useState(false);
  const properties = data.workspace.properties;
  const filtered = properties.filter(
    (property) =>
      `${property.contactName} ${homeAddressText(property.address)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (filter === "All properties" ||
        (filter === "Review requested" && property.reviewRequestedAt !== null) ||
        (filter === "Monthly updates" &&
          property.enrollment.cadence === "monthly" &&
          !property.enrollment.paused)),
  );
  return (
    <>
      <PageHeader
        title="Homeowner reports"
        description="Keep the home, the homeowner and the next conversation connected."
      >
        <Button variant="outline" onClick={() => setHelp(true)}>
          How it works
        </Button>
        <ActionLink href="/homeowners/new">
          <Icon name="plus" decorative size="sm" /> Create report
        </ActionLink>
      </PageHeader>
      <StatCards
        items={[
          {
            label: "Tracked properties",
            value: properties.length,
            detail: "Homes in this workspace",
            icon: "home",
          },
          {
            label: "Saved reports",
            value: properties.reduce((sum, item) => sum + item.reports.length, 0),
            detail: "Ready to reopen or download",
            icon: "file-text",
          },
          {
            label: "Monthly updates",
            value: properties.filter(
              (item) => item.enrollment.cadence === "monthly" && !item.enrollment.paused,
            ).length,
            detail:
              data.workspace.mode === "demo"
                ? "Demo preferences only"
                : "Properties enrolled for refresh",
            icon: "calendar",
          },
          {
            label: "Review requests",
            value: properties.filter((item) => item.reviewRequestedAt).length,
            detail: "Homeowners asking for a conversation",
            icon: "users",
          },
        ]}
      />
      <div className={styles.managementIntro}>
        <div>
          <span className={styles.eyebrow}>Your homeowner relationships</span>
          <h2>A reason to stay in touch.</h2>
          <p>
            Create a branded value-and-equity report. Keep its history, confirm the details and make
            the next step easy.
          </p>
        </div>
        <span className={styles.introIcon}>
          <Icon name="home" decorative size="lg" />
        </span>
      </div>
      <Card padding="none" className={styles.panel}>
        <div className={styles.listTools}>
          <TextField
            label="Search homeowner reports"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Homeowner, street or city"
          />
          <Select
            label="Report filter"
            value={filter}
            options={["All properties", "Review requested", "Monthly updates"]}
            onValueChange={setFilter}
          />
        </div>
        {filtered.length ? (
          <div className={styles.propertyList}>
            {filtered.map((property) => {
              const report = property.reports[0];
              return (
                <Link
                  key={property.id}
                  href={`/homeowners/${property.id}`}
                  className={styles.propertyRow}
                >
                  <span className={styles.propertyIcon}>
                    <Icon name="home" decorative />
                  </span>
                  <span className={styles.propertyText}>
                    <strong>{property.address.street}</strong>
                    <small>
                      {property.contactName} · {property.address.city}, {property.address.state}
                    </small>
                    <small>
                      {report ? `Updated ${homeDate(report.createdAt)}` : "Report not generated"}
                    </small>
                  </span>
                  <span className={styles.propertyValue}>
                    <strong>
                      {report ? homeMoney(report.valuation.valueMinor) : "Unavailable"}
                    </strong>
                    <small>Estimated value</small>
                  </span>
                  <Badge
                    tone={
                      property.reviewRequestedAt
                        ? "warning"
                        : property.enrollment.cadence === "monthly" && !property.enrollment.paused
                          ? "success"
                          : "neutral"
                    }
                  >
                    {property.reviewRequestedAt
                      ? "Review requested"
                      : property.enrollment.cadence === "monthly" && !property.enrollment.paused
                        ? "Monthly"
                        : property.enrollment.cadence === "monthly"
                          ? "Updates paused"
                          : "On demand"}
                  </Badge>
                  <Icon name="arrow-up-right" decorative />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <Icon name="home" decorative size="lg" />
            <EmptyState
              title={
                properties.length
                  ? "No properties match this view"
                  : "Your first homeowner report starts here"
              }
              description={
                properties.length
                  ? "Try another name or clear the report filter."
                  : "Select a homeowner and property, confirm the loan details, and create a report you can revisit."
              }
            />
            {properties.length ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setFilter("All properties");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <ActionLink href="/homeowners/new">
                Create your first report <Icon name="arrow-right" decorative size="sm" />
              </ActionLink>
            )}
          </div>
        )}
      </Card>
      <div className={styles.workspaceFoot}>
        <span>
          {data.workspace.mode === "demo"
            ? "Fictional sample data · saved on this device"
            : `${data.workspace.lookupsThisMonth} of ${data.workspace.monthlyLookupLimit} monthly valuation lookups used`}
        </span>
        <span>Opening a saved report uses no new lookup.</span>
      </div>
      <Dialog
        title="A clear path from property to conversation"
        open={help}
        onClose={() => setHelp(false)}
        description="Create the report once, then keep the relationship moving."
      >
        <ol className={styles.helpSteps}>
          <li>
            <strong>Choose a property or a linked homeowner report.</strong>
            <p>
              Start with a confirmed address. Select an existing HighLevel contact when preparing
              homeowner follow-up.
            </p>
          </li>
          <li>
            <strong>Confirm the mortgage details.</strong>
            <p>Use current balances, model scheduled payments, or leave debt unknown.</p>
          </li>
          <li>
            <strong>Review the branded report.</strong>
            <p>See value, range, comparable listings and clearly stated assumptions.</p>
          </li>
          <li>
            <strong>Take the next step.</strong>
            <p>
              Download a PDF, create an expiring share link, or arrange a HighLevel handoff in a
              connected workspace.
            </p>
          </li>
        </ol>
      </Dialog>
    </>
  );
}

function HomeRecoveryControls({
  propertyId,
  reportId,
  data,
}: {
  propertyId: string;
  reportId?: string;
  data: ReturnType<typeof useHomeWorkspace>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  if (data.workspace.mode === "demo" || !data.workspace.canWrite) return null;
  async function recover(action: HomeAction) {
    try {
      const result = await data.command(action);
      setMessage(result.message ?? "The review was recorded.");
      setConfirmed(false);
    } catch {
      setMessage("The hold was not cleared. Review the message above before continuing.");
    }
  }
  return (
    <details className={`${styles.note} ${styles.screenOnly}`}>
      <summary>Review interrupted actions</summary>
      <div className={styles.formStack}>
        <p>
          Wait at least five minutes for an unfinished lookup or handoff. Check HighLevel's contact
          history before clearing a delivery hold. Clearing a hold does not repeat a lookup or send
          a report.
        </p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I have checked the current lookup or HighLevel history and authorize closing the
            interrupted action.
          </span>
        </label>
        <div className={styles.actions}>
          <Button
            variant="outline"
            disabled={!confirmed || data.busy}
            onClick={() => void recover({ action: "recover-lookup", propertyId, confirmed: true })}
          >
            Close unfinished lookup
          </Button>
          {reportId ? (
            <Button
              variant="outline"
              disabled={!confirmed || data.busy}
              onClick={() =>
                void recover({ action: "resolve-delivery", reportId, confirmed: true })
              }
            >
              Record delivery review
            </Button>
          ) : null}
        </div>
        {message ? <LiveRegion visible message={message} /> : null}
      </div>
    </details>
  );
}

function HomeReportDetails({
  property,
  data,
}: {
  property: HomeProperty;
  data: ReturnType<typeof useHomeWorkspace>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(property.reports[0]?.id ?? "");
  const report = property.reports.find((item) => item.id === selectedId) ?? property.reports[0];
  const [dialog, setDialog] = useState<
    "share" | "deliver" | "edit" | "schedule" | "delete" | "refresh" | null
  >(null);
  const [mortgage, setMortgage] = useState(() => mortgageDraft(report?.input.mortgage));
  const [brand, setBrand] = useState(report?.input.brand ?? blankHomeBrand);
  const [cadence, setCadence] = useState(property.enrollment.cadence);
  const [deliver, setDeliver] = useState(property.enrollment.deliverUpdates);
  const [paused, setPaused] = useState(property.enrollment.paused);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [share, setShare] = useState<{ url: string; expiresAt?: string } | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const { reportStatus, busy } = data;
  const reportId = report?.id;
  useEffect(() => {
    let active = true;
    if (reportId && !busy)
      void reportStatus(reportId).then(
        (result) => {
          if (active) setDeliveryStatus(result?.status ?? null);
        },
        () => {
          if (active) setDeliveryStatus("unavailable");
        },
      );
    return () => {
      active = false;
    };
  }, [reportId, reportStatus, busy]);
  async function act(action: HomeAction) {
    if (data.busy) return;
    setMessage("");
    setActionError("");
    try {
      const result = await data.command(action);
      if (result.report) setSelectedId(result.report.id);
      if (action.action === "revoke") setShare(null);
      if (result.url)
        setShare({ url: result.url, ...(result.expiresAt ? { expiresAt: result.expiresAt } : {}) });
      setMessage(
        result.message ??
          (result.report ? "The report has been saved." : "The report link is ready."),
      );
      setDialog(null);
      if (action.action === "delete") router.push("/homeowners");
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : "The action was not completed. Check the report details and try again.",
      );
    }
  }
  function open(next: typeof dialog) {
    if (data.busy) return;
    data.clearError();
    setActionError("");
    setMessage("");
    setConsent(false);
    setRequestId(crypto.randomUUID());
    if (next === "edit" && report) {
      setMortgage(mortgageDraft(report.input.mortgage));
      setBrand(report.input.brand);
    }
    if (next === "schedule") {
      setCadence(property.enrollment.cadence);
      setDeliver(property.enrollment.deliverUpdates);
      setPaused(property.enrollment.paused);
    }
    setDialog(next);
  }
  async function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report || data.busy) return;
    try {
      await act({
        action: "revise",
        reportId: report.id,
        requestId,
        mortgage: mortgageFromDraft(mortgage),
        brand,
      });
    } catch {
      setActionError("Check the mortgage details and branding fields before saving.");
    }
  }
  async function copyShareLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setMessage("Report link copied.");
    } catch {
      setMessage("Clipboard access is unavailable. Select the report link to copy it.");
    }
  }
  if (!report)
    return (
      <>
        <PageHeader
          title={property.address.street}
          description="A report has not been saved for this property yet."
        />
        <p className={styles.note}>
          The last lookup did not produce a saved report. Check the connection and lookup status
          before starting a new request.
        </p>
        <HomeRecoveryControls propertyId={property.id} data={data} />
        {data.workspace.canWrite ? (
          <Button variant="outline" disabled={data.busy} onClick={() => open("delete")}>
            Remove property
          </Button>
        ) : null}
        <ActionLink href="/homeowners/new">Create a report</ActionLink>
        <ActionLink href="/homeowners" secondary>
          Back to homeowner reports
        </ActionLink>
        <Dialog
          title="Remove this property?"
          open={dialog === "delete"}
          onClose={() => {
            if (!data.busy) setDialog(null);
          }}
        >
          <p>
            This removes the property and its unfinished report requests. It does not repeat a
            valuation, erase recorded lookup usage, or delete a HighLevel contact.
          </p>
          <label className={styles.check}>
            <input
              type="checkbox"
              disabled={data.busy}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>I confirm removal of this property's reports.</span>
          </label>
          {actionError ? <LiveRegion urgency="alert" visible message={actionError} /> : null}
          <Button
            disabled={!consent || data.busy}
            onClick={() => void act({ action: "delete", propertyId: property.id, confirmed: true })}
          >
            {data.busy ? "Removing…" : "Remove property"}
          </Button>
        </Dialog>
      </>
    );
  const titles = {
    share: "Create a private report link?",
    deliver: "Hand this report to HighLevel?",
    edit: "Update mortgage details",
    schedule: "Monthly report updates",
    delete: "Remove this property?",
    refresh: "Request a fresh valuation?",
  };
  return (
    <>
      <header className={`${styles.pageHeader} ${styles.screenOnly}`}>
        <div>
          <Link href="/homeowners" className={styles.backLink}>
            Homeowner reports
          </Link>
          <h1>{property.address.street}</h1>
          <p>
            {property.contactName} · {property.reports.length} saved{" "}
            {property.reports.length === 1 ? "report" : "reports"}
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" disabled={data.busy} onClick={() => void data.download(report)}>
            <Icon name="download" decorative size="sm" /> Download PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          {data.workspace.canWrite ? (
            <Button
              onClick={() => open("share")}
              disabled={data.busy || data.workspace.mode === "demo"}
            >
              Share report <Icon name="arrow-up-right" decorative size="sm" />
            </Button>
          ) : null}
        </div>
      </header>
      {message ? <LiveRegion visible message={message} /> : null}
      {actionError && dialog === null ? (
        <LiveRegion urgency="alert" visible message={actionError} />
      ) : null}
      {property.lastError ? (
        <p className={`${styles.note} ${styles.screenOnly}`}>
          The last valuation or update could not be completed. Your saved report is still available.
          Review the connection and request status before starting another lookup.
        </p>
      ) : null}
      {property.enrollment.cadence === "monthly" && property.enrollment.paused ? (
        <p className={`${styles.note} ${styles.screenOnly}`}>
          Monthly updates are paused. Review the property details and connections, then use Update
          schedule to resume them.
        </p>
      ) : null}
      {property.reviewRequestedAt ? (
        <div className={styles.notice}>
          <Icon name="users" decorative />
          <span>
            <strong>{property.contactName} requested a review</strong>
            <p>Requested {homeDate(property.reviewRequestedAt)}. Follow up in HighLevel.</p>
          </span>
          {data.workspace.canWrite ? (
            <Button
              variant="outline"
              disabled={data.busy}
              onClick={() => void act({ action: "resolve-review", propertyId: property.id })}
            >
              Mark reviewed
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className={`${styles.detailToolbar} ${styles.screenOnly}`}>
        <Select
          label="Report history"
          disabled={data.busy}
          value={report.id}
          options={property.reports.map((item, index) => ({
            value: item.id,
            label: `${homeDate(item.createdAt)} · Report ${property.reports.length - index}${index === 0 ? " (latest)" : ""}`,
          }))}
          onValueChange={setSelectedId}
        />
        <div className={styles.actions}>
          {data.workspace.canWrite ? (
            <>
              <Button variant="outline" disabled={data.busy} onClick={() => open("edit")}>
                Update loan details
              </Button>
              <Button
                variant="outline"
                disabled={
                  data.busy ||
                  (data.workspace.mode !== "demo" && !data.workspace.valuationConnected)
                }
                onClick={() => open("refresh")}
              >
                Refresh value
              </Button>
              <Button variant="outline" disabled={data.busy} onClick={() => open("schedule")}>
                <Icon name="calendar" decorative size="sm" />{" "}
                {property.enrollment.cadence === "monthly" && !property.enrollment.paused
                  ? "Monthly updates"
                  : "Update schedule"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <HomeReportView report={report} />
      {deliveryStatus ? (
        <p className={`${styles.note} ${styles.screenOnly}`}>
          {deliveryStatus === "sent"
            ? "This report was handed to HighLevel. Check the contact's workflow history for actual message delivery."
            : deliveryStatus === "pending"
              ? "A HighLevel handoff is in progress. It will not be submitted twice."
              : deliveryStatus === "uncertain"
                ? "HighLevel did not confirm the handoff. Review the contact's workflow history before authorizing any later delivery."
                : deliveryStatus === "blocked"
                  ? "This report's handoff is closed. A later delivery requires a new report and your confirmation."
                  : "Delivery status could not be checked. Refresh the page before starting another handoff."}
        </p>
      ) : null}
      <div className={`${styles.followupBar} ${styles.screenOnly}`}>
        <div>
          <h2>Make the next conversation easy.</h2>
          <p>
            {report.input.association === "property_only"
              ? "This is a standalone property valuation. Create a homeowner report with a verified contact to use HighLevel follow-up."
              : data.workspace.mode === "demo"
                ? "This sample report can be downloaded or printed. Private sharing and delivery require a connected workspace."
                : "A HighLevel handoff saves the report link to the configured contact field and starts your approved workflow."}
          </p>
        </div>
        <Button
          disabled={
            data.busy ||
            !data.workspace.deliveryEnabled ||
            !data.workspace.canWrite ||
            report.input.association === "property_only"
          }
          onClick={() => open("deliver")}
        >
          Hand off to HighLevel <Icon name="arrow-right" decorative size="sm" />
        </Button>
      </div>
      {share ? (
        <div className={`${styles.shareResult} ${styles.screenOnly}`}>
          <TextField label="Private report link" value={share.url} readOnly />
          <Button variant="outline" onClick={() => void copyShareLink()}>
            Copy link
          </Button>
          {share.expiresAt ? (
            <small>
              Expires {homeDate(share.expiresAt)}. Anyone with this link can view the report.
            </small>
          ) : null}
        </div>
      ) : null}
      {data.workspace.canWrite ? (
        <div className={`${styles.maintenance} ${styles.screenOnly}`}>
          <Button
            variant="ghost"
            disabled={data.busy || data.workspace.mode === "demo"}
            onClick={() => {
              void act({ action: "revoke", propertyId: property.id });
            }}
          >
            Revoke share links
          </Button>
          <Button variant="ghost" disabled={data.busy} onClick={() => open("delete")}>
            Remove property
          </Button>
        </div>
      ) : null}
      <HomeRecoveryControls propertyId={property.id} reportId={report.id} data={data} />
      <Dialog
        title={dialog ? titles[dialog] : "Report action"}
        open={dialog !== null}
        onClose={() => {
          if (!data.busy) setDialog(null);
        }}
        description={
          dialog === "edit"
            ? "This creates a new saved report using the same valuation. No new lookup is requested."
            : undefined
        }
      >
        <fieldset
          className={styles.actionFields}
          disabled={data.busy}
          onChange={() => {
            setActionError("");
            setMessage("");
          }}
        >
          {dialog === "edit" ? (
            <form className={styles.formStack} onSubmit={(event) => void edit(event)}>
              <MortgageFields value={mortgage} onChange={setMortgage} />
              <details>
                <summary>Edit report branding</summary>
                <HomeBrandFields value={brand} onChange={setBrand} />
              </details>
              <Button type="submit" disabled={data.busy}>
                Save updated report
              </Button>
            </form>
          ) : dialog === "schedule" ? (
            <div className={styles.formStack}>
              <Select
                label="Update frequency"
                value={cadence}
                options={[
                  { value: "off", label: "On demand only" },
                  { value: "monthly", label: "Monthly valuation refresh" },
                ]}
                onValueChange={(value) => setCadence(value === "monthly" ? "monthly" : "off")}
              />
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={paused}
                  onChange={(event) => setPaused(event.target.checked)}
                />
                <span>Pause scheduled updates</span>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={deliver}
                  disabled={
                    data.workspace.mode === "demo" || report.input.association === "property_only"
                  }
                  onChange={(event) => setDeliver(event.target.checked)}
                />
                <span>
                  Hand fresh reports to the configured HighLevel workflow when communication and
                  source checks pass.
                </span>
              </label>
              <p className={styles.note}>
                {data.workspace.mode === "demo"
                  ? "This saves a demo preference only. No background job or message will run."
                  : "Each fresh valuation counts toward your monthly lookup allowance. Loan details older than 35 days are omitted from monthly reports until you confirm current balances. Delivery stops when communication is not allowed or the report cannot be verified."}
              </p>
              <Button
                disabled={data.busy}
                onClick={() =>
                  void act({
                    action: "enrollment",
                    propertyId: property.id,
                    cadence,
                    paused,
                    deliverUpdates: deliver,
                    confirmed: true,
                  })
                }
              >
                Save update preferences
              </Button>
            </div>
          ) : (
            <div className={styles.formStack}>
              <p>
                {dialog === "delete"
                  ? "This removes the property, all saved report history and its share links from this workspace. It does not delete the HighLevel contact."
                  : dialog === "refresh"
                    ? "A fresh valuation may use one lookup from your allowance. Mortgage inputs keep their original date. Confirm current balances separately when needed."
                    : dialog === "deliver"
                      ? "This starts the configured HighLevel workflow for the selected homeowner. The workflow may send messages based on its configuration. Check that it is the correct report and contact."
                      : "The private link gives anyone who has it access to this property's value and supplied loan information. It expires automatically and can be revoked."}
              </p>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  {dialog === "delete"
                    ? "I confirm removal of this property's reports."
                    : dialog === "refresh"
                      ? "I confirm this new valuation request."
                      : dialog === "deliver"
                        ? "I confirm this homeowner and authorize the workflow handoff."
                        : "I authorize sharing this report with the intended homeowner."}
                </span>
              </label>
              <Button
                disabled={!consent || data.busy}
                onClick={() => {
                  if (dialog === "delete")
                    void act({ action: "delete", propertyId: property.id, confirmed: true });
                  else if (dialog === "refresh")
                    void act({
                      action: "refresh",
                      propertyId: property.id,
                      requestId,
                      confirmed: true,
                    });
                  else if (dialog === "share" || dialog === "deliver")
                    void act({ action: dialog, reportId: report.id, confirmed: true });
                }}
              >
                {data.busy
                  ? "Working…"
                  : dialog === "delete"
                    ? "Remove property"
                    : dialog === "refresh"
                      ? "Request valuation"
                      : dialog === "deliver"
                        ? "Confirm HighLevel handoff"
                        : "Create report link"}
              </Button>
            </div>
          )}
        </fieldset>
        {actionError ? <LiveRegion urgency="alert" visible message={actionError} /> : null}
      </Dialog>
    </>
  );
}

export function HomeownerWorkspace({
  view = "list",
  propertyId,
  initialBrand = blankHomeBrand,
}: {
  view?: "list" | "new" | "detail";
  propertyId?: string;
  initialBrand?: HomeBrand;
}) {
  const data = useHomeWorkspace();
  const demo = useDashboardPreview();
  if (!data.ready)
    return (
      <div className={styles.workspace}>
        <p role="status">Opening homeowner reports…</p>
      </div>
    );
  const brand: HomeBrand = demo
    ? {
        ...blankHomeBrand,
        ...demo.state.profile,
        name: demo.state.profile.name === "Preview owner" ? "Alex Morgan" : demo.state.profile.name,
      }
    : initialBrand;
  // Select only the brand contract fields; the dashboard profile also carries a market area.
  const cleanBrand: HomeBrand = {
    name: brand.name,
    company: brand.company,
    email: brand.email,
    phone: brand.phone,
    nmls: brand.nmls,
    companyNmls: brand.companyNmls,
    tagline: brand.tagline,
  };
  const property = data.workspace.properties.find((item) => item.id === propertyId);
  return (
    <div className={styles.workspace} data-product-shell="true" data-homeowner-workspace="true">
      {data.error ? <LiveRegion urgency="alert" message={data.error} visible /> : null}
      {data.workspace.mode === "live" && !data.workspace.valuationConnected ? (
        <div className={styles.notice}>
          <span>
            <strong>Valuations need to be connected</strong>
            <p>
              Your report workspace is ready. A valuation connection is required before creating a
              report; saved reports can still be opened and downloaded.
            </p>
          </span>
          <Button variant="outline" disabled={data.busy} onClick={() => void data.reload()}>
            Check connection
          </Button>
        </div>
      ) : null}
      {data.workspace.mode === "unconfigured" ? (
        <>
          <PageHeader
            title="Homeowner reports"
            description="Your property-value and equity workspace."
          />
          <Card className={styles.empty} padding="md">
            <Icon name="home" decorative size="lg" />
            <h2>Connect the report workspace</h2>
            <p>
              Property valuations need an enabled account, saved-report storage and a valuation
              connection. HighLevel is optional for homeowner follow-up. Your workspace owner can
              finish these connections.
            </p>
            <Button variant="outline" onClick={() => void data.reload()}>
              Check connection again
            </Button>
            <ActionLink href="/settings/connections" secondary>
              Workspace connections
            </ActionLink>
          </Card>
        </>
      ) : view === "new" ? (
        <HomeReportBuilder data={data} initialBrand={cleanBrand} />
      ) : view === "detail" ? (
        property ? (
          <HomeReportDetails key={property.id} property={property} data={data} />
        ) : (
          <>
            <PageHeader
              title="This property report is not available."
              description="Check the workspace or return to your saved reports."
            />
            <ActionLink href="/homeowners">Back to homeowner reports</ActionLink>
          </>
        )
      ) : (
        <HomeReportList data={data} />
      )}
    </div>
  );
}
