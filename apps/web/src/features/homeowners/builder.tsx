"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation.js";
import {
  HomeAddressSchema,
  HomeBrandSchema,
  HomeReportInputSchema,
  type HomeAddress,
  type HomeBrand,
} from "@oalo/contracts";
import { Button, Card, Icon, Link, LiveRegion, Select, TextField } from "@oalo/ui";
import type { useHomeWorkspace } from "./use-home-workspace.js";
import { homeAddressText, sampleHomeAddress } from "./model.js";
import { MortgageFields, mortgageDraft, mortgageFromDraft } from "./mortgage-fields.js";
import styles from "./homeowners.module.css";

export function HomeBrandFields({
  value,
  onChange,
}: {
  value: HomeBrand;
  onChange: (brand: HomeBrand) => void;
}) {
  const update = (key: keyof HomeBrand, text: string) => onChange({ ...value, [key]: text });
  return (
    <div className={styles.formGrid}>
      <TextField
        label="Loan officer name"
        value={value.name}
        maxLength={120}
        minLength={2}
        onChange={(event) => update("name", event.target.value)}
        requirement="required"
      />
      <TextField
        label="Company name"
        value={value.company}
        maxLength={160}
        minLength={2}
        onChange={(event) => update("company", event.target.value)}
        requirement="required"
      />
      <TextField
        label="Loan officer email"
        type="email"
        value={value.email}
        maxLength={200}
        onChange={(event) => update("email", event.target.value)}
      />
      <TextField
        label="Loan officer phone"
        value={value.phone}
        maxLength={40}
        onChange={(event) => update("phone", event.target.value)}
      />
      <TextField
        label="Loan officer NMLS"
        value={value.nmls}
        maxLength={12}
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(event) => update("nmls", event.target.value)}
      />
      <TextField
        label="Company NMLS"
        value={value.companyNmls}
        maxLength={12}
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(event) => update("companyNmls", event.target.value)}
      />
      <TextField
        label="Brand tagline"
        value={value.tagline}
        maxLength={300}
        onChange={(event) => update("tagline", event.target.value)}
      />
    </div>
  );
}

export function HomeReportBuilder({
  data,
  initialBrand,
}: {
  data: ReturnType<typeof useHomeWorkspace>;
  initialBrand: HomeBrand;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<HomeAddress>({
    street: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string | null }[]>(
    [],
  );
  const [contact, setContact] = useState<{ id: string; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mortgage, setMortgage] = useState(() => mortgageDraft());
  const [brand, setBrand] = useState(initialBrand);
  const [basis, setBasis] = useState<"requested_report" | "existing_relationship">(
    "requested_report",
  );
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const demo = data.workspace.mode === "demo";
  const [association, setAssociation] = useState<"property_only" | "ghl_contact">(() =>
    demo || data.workspace.ghlConnected ? "ghl_contact" : "property_only",
  );
  const propertyOnly = association === "property_only";
  async function search() {
    setSearching(true);
    setError("");
    try {
      setContacts(await data.searchContacts(query));
      setSearched(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Contacts could not be loaded.");
    } finally {
      setSearching(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (step === 0) {
        HomeAddressSchema.parse(address);
        if ((!propertyOnly && !contact) || !confirmed)
          throw new Error(
            propertyOnly
              ? "Confirm the property address before continuing."
              : "Select the homeowner and confirm the property address.",
          );
        setStep(1);
        return;
      }
      const parsedMortgage = mortgageFromDraft(mortgage);
      if (step === 1) {
        setStep(2);
        return;
      }
      const input = HomeReportInputSchema.parse({
        requestId,
        association,
        contactId: propertyOnly ? "property-only" : contact?.id,
        contactName: propertyOnly ? "Property valuation" : contact?.name,
        address,
        mortgage: parsedMortgage,
        brand: HomeBrandSchema.parse(brand),
        communicationBasis: propertyOnly ? "requested_report" : basis,
        confirmedProperty: confirmed,
      });
      const result = await data.command({ action: "create", input });
      if (result.report) router.push(`/homeowners/${result.report.propertyId}`);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "Check the required fields, balances and dates before continuing.",
      );
    }
  }
  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <Link href="/homeowners" className={styles.backLink}>
            Homeowner reports
          </Link>
          <h1>Create a homeowner report</h1>
          <p>One property. A clear view of value, equity and the next conversation.</p>
        </div>
      </header>
      {!demo && !data.workspace.valuationConnected ? (
        <p className={styles.note}>
          Property valuations are not connected in this workspace yet. You can prepare the report
          details now; your workspace owner needs to enable value estimates before you create it.
        </p>
      ) : null}
      <nav className={styles.builderSteps} aria-label="Report creation progress">
        {["Property & homeowner", "Mortgage details", "Review & create"].map((label, index) => (
          <div
            key={label}
            aria-current={index === step ? "step" : undefined}
            data-complete={index < step}
          >
            <span>{index < step ? <Icon name="check" decorative size="sm" /> : index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </nav>
      <div className={styles.builderColumns}>
        <Card padding="none" className={styles.panel}>
          <form onSubmit={(event) => void submit(event)} className={styles.builderForm}>
            {step === 0 ? (
              <>
                <div className={styles.sectionHeading}>
                  <h2>{propertyOnly ? "Start with the property" : "Start with the homeowner"}</h2>
                  <p>
                    {propertyOnly
                      ? "Enter an address to retrieve its estimated value, range and comparable listings. A HighLevel connection is not required."
                      : demo
                        ? "Choose a fictional sample contact to try the complete workflow."
                        : "Search the existing contacts in this workspace's HighLevel location."}
                  </p>
                </div>
                <Select
                  label="Report type"
                  value={association}
                  options={[
                    { value: "property_only", label: "Property valuation (no contact required)" },
                    {
                      value: "ghl_contact",
                      label: "Homeowner report with HighLevel contact",
                      disabled: !demo && !data.workspace.ghlConnected,
                    },
                  ]}
                  onValueChange={(value) => {
                    setAssociation(value === "property_only" ? "property_only" : "ghl_contact");
                    setConfirmed(false);
                  }}
                />
                {!propertyOnly ? (
                  <>
                    <div className={styles.searchRow}>
                      <TextField
                        label="Search homeowner contacts"
                        value={query}
                        minLength={2}
                        maxLength={100}
                        placeholder="Name or email"
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={query.trim().length < 2 || searching}
                        onClick={() => void search()}
                      >
                        {searching ? "Searching…" : "Search contacts"}
                      </Button>
                    </div>
                    {contacts.length ? (
                      <Select
                        label="Homeowner contact"
                        value={contact?.id ?? ""}
                        options={[
                          { value: "", label: "Choose a contact", disabled: true },
                          ...contacts.map((person) => ({
                            value: person.id,
                            label: person.name,
                            description: person.email ?? "",
                          })),
                        ]}
                        onValueChange={(id) => {
                          const selected = contacts.find((item) => item.id === id);
                          if (selected) {
                            setContact(selected);
                            setConfirmed(false);
                          }
                        }}
                      />
                    ) : searched ? (
                      <p className={styles.note}>
                        No matching contacts. Try another name or email.
                      </p>
                    ) : null}
                  </>
                ) : null}
                {demo ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddress(sampleHomeAddress);
                      setContacts([
                        { id: "sample-lead-1", name: "Morgan Ellis", email: "morgan@example.test" },
                      ]);
                      setContact({ id: "sample-lead-1", name: "Morgan Ellis" });
                      setQuery("Morgan");
                      setConfirmed(false);
                    }}
                  >
                    Use fictional sample property <Icon name="home" decorative size="sm" />
                  </Button>
                ) : null}
                <div className={styles.divider} />
                <h2>Confirm the property</h2>
                <TextField
                  label="Property street address"
                  value={address.street}
                  minLength={3}
                  maxLength={200}
                  requirement="required"
                  placeholder="Street address and unit"
                  onChange={(event) => {
                    setAddress({ ...address, street: event.target.value });
                    setConfirmed(false);
                  }}
                />
                <div className={styles.formGrid}>
                  <TextField
                    label="City"
                    value={address.city}
                    minLength={2}
                    maxLength={100}
                    requirement="required"
                    onChange={(event) => {
                      setAddress({ ...address, city: event.target.value });
                      setConfirmed(false);
                    }}
                  />
                  <TextField
                    label="State"
                    value={address.state}
                    maxLength={2}
                    minLength={2}
                    requirement="required"
                    onChange={(event) => {
                      setAddress({ ...address, state: event.target.value.toUpperCase() });
                      setConfirmed(false);
                    }}
                  />
                  <TextField
                    label="ZIP code"
                    value={address.postalCode}
                    maxLength={10}
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    requirement="required"
                    onChange={(event) => {
                      setAddress({ ...address, postalCode: event.target.value });
                      setConfirmed(false);
                    }}
                  />
                </div>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    {propertyOnly
                      ? "I have confirmed the property address and authorize this valuation lookup."
                      : "I have confirmed this property belongs with the selected homeowner contact."}
                  </span>
                </label>
                {!propertyOnly ? (
                  <Select
                    label="Reason for preparing this report"
                    value={basis}
                    options={[
                      { value: "requested_report", label: "The homeowner requested a report" },
                      { value: "existing_relationship", label: "An existing client relationship" },
                    ]}
                    onValueChange={(value) =>
                      setBasis(
                        value === "requested_report" ? "requested_report" : "existing_relationship",
                      )
                    }
                  />
                ) : null}
              </>
            ) : step === 1 ? (
              <>
                <div className={styles.sectionHeading}>
                  <h2>Build the equity picture</h2>
                  <p>Use confirmed balances, a transparent estimate, or leave debt unknown.</p>
                </div>
                <MortgageFields value={mortgage} onChange={setMortgage} />
              </>
            ) : (
              <>
                <div className={styles.sectionHeading}>
                  <h2>Make the report yours</h2>
                  <p>Your contact and company details appear on the report and its PDF.</p>
                </div>
                <HomeBrandFields value={brand} onChange={setBrand} />
                <div className={styles.reviewSummary}>
                  <strong>{propertyOnly ? "Property valuation" : contact?.name}</strong>
                  <p>{homeAddressText(address)}</p>
                  <span>
                    {mortgage.source === "unknown"
                      ? "Property-value report; equity unavailable"
                      : "Value and equity report using the supplied loan inputs"}
                  </span>
                </div>
                <p className={styles.note}>
                  {demo
                    ? "This creates a fictional sample report on this device. No paid valuation is requested."
                    : "Creating a report may use one valuation lookup from your workspace allowance. Viewing and downloading saved reports do not request a new valuation."}
                </p>
              </>
            )}
            {error ? <LiveRegion urgency="alert" message={error} visible /> : null}
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || data.busy}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Back
              </Button>
              <span>Step {step + 1} of 3</span>
              <Button
                type="submit"
                disabled={
                  data.busy ||
                  (!demo &&
                    (!data.workspace.canWrite ||
                      (step === 2 && !data.workspace.valuationConnected)))
                }
              >
                {data.busy ? "Creating report…" : step === 2 ? "Create report" : "Continue"}
                <Icon name="arrow-right" decorative size="sm" />
              </Button>
            </div>
            {error && step === 2 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRequestId(crypto.randomUUID());
                  setError("A new request is ready. Creating it may use a new valuation lookup.");
                }}
              >
                Start a new lookup request
              </Button>
            ) : null}
          </form>
        </Card>
        <aside className={styles.builderAside}>
          <span className={styles.eyebrow}>A report worth sharing</span>
          <h2>
            More clarity.
            <br />A better conversation.
          </h2>
          <p>
            Give homeowners a useful picture of their property and what sits behind the numbers.
          </p>
          <div className={styles.benefit}>
            <Icon name="home" decorative />
            <span>
              <strong>Property value & range</strong>
              <small>With the source and retrieval date.</small>
            </span>
          </div>
          <div className={styles.benefit}>
            <Icon name="layers" decorative />
            <span>
              <strong>Transparent equity</strong>
              <small>Based on the balances you confirm.</small>
            </span>
          </div>
          <div className={styles.benefit}>
            <Icon name="file-text" decorative />
            <span>
              <strong>A saved report & PDF</strong>
              <small>Reopen without another lookup.</small>
            </span>
          </div>
          <div className={styles.benefit}>
            <Icon name="calendar" decorative />
            <span>
              <strong>Room for the next update</strong>
              <small>History, monthly preferences and follow-up.</small>
            </span>
          </div>
          <small>
            {demo
              ? "Sample data is fictional and stays on this device."
              : "Live reports stay within your authenticated workspace."}
          </small>
        </aside>
      </div>
    </>
  );
}
