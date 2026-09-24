"use client";
import { useState } from "react";
import type { HomeReport } from "@oalo/contracts";
import {
  homeReportFreshness,
  estimatedSaleProceeds,
  hypotheticalBorrowingRoom,
} from "@oalo/application/homeowner-reports";
import { Badge, Card, Icon, TextField } from "@oalo/ui";
import { homeDate, homeMoney } from "./model.js";
import styles from "./homeowners.module.css";

export function HomeReportView({ report }: { report: HomeReport }) {
  const { valuation, financials, input } = report;
  const [cost, setCost] = useState("6");
  const [ltv, setLtv] = useState("80");
  const freshness = homeReportFreshness(report);
  const validCost =
    cost.trim() !== "" && Number.isFinite(Number(cost)) && Number(cost) >= 0 && Number(cost) <= 20;
  const validLtv =
    ltv.trim() !== "" && Number.isFinite(Number(ltv)) && Number(ltv) >= 1 && Number(ltv) <= 100;
  const equityFraction =
    financials.equityMinor === null
      ? 0
      : Math.max(0, Math.min(100, (financials.equityMinor / valuation.valueMinor) * 100));
  const labels = {
    confirmed: "Confirmed current balances",
    amortized: "Estimated from original terms",
    debt_free: "No secured debt declared",
    unknown: "Loan details not supplied",
  };
  return (
    <article className={styles.report} data-home-report="true">
      <header className={styles.reportHeader}>
        <div className={styles.reportBrand}>
          <span className={styles.brandMark}>
            <Icon name="home" decorative />
          </span>
          <span>
            <strong>{input.brand.company}</strong>
            <small>{input.brand.tagline || "Your home. Your next chapter."}</small>
          </span>
        </div>
        <span className={styles.reportDate}>
          HOMEOWNER REPORT
          <br />
          {homeDate(report.createdAt)}
        </span>
      </header>
      <div className={styles.reportIntro}>
        <span className={styles.eyebrow}>
          {input.association === "property_only"
            ? "Property valuation report"
            : `Prepared for ${input.contactName}`}
        </span>
        <h2>{input.address.street}</h2>
        <p>
          {input.address.city}, {input.address.state} {input.address.postalCode}
        </p>
        {valuation.source === "sample" ? (
          <Badge tone="info">Fictional sample report</Badge>
        ) : (
          <Badge tone="info">RentCast value estimate</Badge>
        )}
      </div>
      {freshness.valuationStale || freshness.mortgageStale ? (
        <div className={styles.notice}>
          <Icon name="info" decorative />
          <p>
            {freshness.valuationStale ? "This valuation is more than 35 days old. " : ""}
            {freshness.mortgageStale ? "The mortgage information is more than 35 days old. " : ""}
            Review the source dates before making plans.
          </p>
        </div>
      ) : null}
      <section className={styles.valueHero} aria-label="Property value estimate">
        <span className={styles.eyebrow}>Estimated home value</span>
        <strong>{homeMoney(valuation.valueMinor)}</strong>
        <p>
          {valuation.lowMinor !== null && valuation.highMinor !== null
            ? `${homeMoney(valuation.lowMinor)} to ${homeMoney(valuation.highMinor)} estimated range`
            : "An estimated range was not supplied."}
        </p>
        <div className={styles.valueFoot}>
          <span>
            <Icon name="calendar" decorative size="sm" /> Retrieved{" "}
            {homeDate(valuation.retrievedAt)}
          </span>
          <span>An estimate, not an appraisal</span>
        </div>
      </section>
      <div className={styles.reportColumns}>
        <Card padding="none" className={styles.reportCard}>
          <div className={styles.sectionHeading}>
            <h3>Your equity picture</h3>
            <p>The value of your home, less the balances secured against it.</p>
          </div>
          <div className={styles.equityValue}>
            <span>Estimated equity</span>
            <strong>{homeMoney(financials.equityMinor)}</strong>
            {financials.equityLowMinor !== null && financials.equityHighMinor !== null ? (
              <small>
                {homeMoney(financials.equityLowMinor)} to {homeMoney(financials.equityHighMinor)}
              </small>
            ) : null}
          </div>
          {financials.totalDebtMinor !== null ? (
            <div
              className={styles.equityChart}
              role="img"
              aria-label={`${homeMoney(financials.equityMinor)} equity and ${homeMoney(financials.totalDebtMinor)} secured debt`}
            >
              <span style={{ inlineSize: `${equityFraction}%` }} />
            </div>
          ) : null}
          <dl className={styles.dataRows}>
            <div>
              <dt>First mortgage</dt>
              <dd>{homeMoney(financials.firstBalanceMinor)}</dd>
            </div>
            <div>
              <dt>Other secured balances</dt>
              <dd>{homeMoney(input.mortgage.otherBalanceMinor)}</dd>
            </div>
            <div>
              <dt>Total secured debt</dt>
              <dd>{homeMoney(financials.totalDebtMinor)}</dd>
            </div>
            <div>
              <dt>Combined loan-to-value</dt>
              <dd>
                {financials.combinedLtvPercent === null
                  ? "Unavailable"
                  : `${financials.combinedLtvPercent}%`}
              </dd>
            </div>
          </dl>
          <p className={styles.cardNote}>
            {financials.totalDebtMinor === null
              ? "Equity stays unavailable until all secured balances are known. Missing debt is never treated as zero."
              : financials.equityMinor !== null && financials.equityMinor < 0
                ? "The supplied secured balances exceed the estimated property value."
                : "Equity is not sale proceeds or an approved borrowing amount."}
          </p>
        </Card>
        <Card padding="none" className={styles.reportCard}>
          <div className={styles.sectionHeading}>
            <h3>About the property</h3>
            <p>Details supplied with this valuation.</p>
          </div>
          <dl className={styles.dataRows}>
            <div>
              <dt>Property type</dt>
              <dd>{valuation.propertyType ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Bedrooms</dt>
              <dd>{valuation.bedrooms ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Bathrooms</dt>
              <dd>{valuation.bathrooms ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Living area</dt>
              <dd>
                {valuation.squareFeet === null
                  ? "Unavailable"
                  : `${valuation.squareFeet.toLocaleString()} sq ft`}
              </dd>
            </div>
            <div>
              <dt>Year built</dt>
              <dd>{valuation.yearBuilt ?? "Unavailable"}</dd>
            </div>
          </dl>
          <p className={styles.cardNote}>Matched property: {valuation.matchedAddress}</p>
        </Card>
      </div>
      <section className={styles.reportSection}>
        <div className={styles.sectionHeading}>
          <h3>Nearby comparable listings</h3>
          <p>Listing prices provide context. They are not verified closed-sale prices.</p>
        </div>
        <div className={styles.comparables}>
          {valuation.comparables.map((comp, index) => (
            <Card key={`${comp.address}-${index}`} padding="md" className={styles.compCard}>
              <span className={styles.compNumber}>0{index + 1}</span>
              <strong>{homeMoney(comp.priceMinor)}</strong>
              <h4>{comp.address}</h4>
              <p>
                {comp.bedrooms ?? "?"} beds · {comp.bathrooms ?? "?"} baths ·{" "}
                {comp.squareFeet?.toLocaleString() ?? "?"} sq ft
              </p>
              <small>
                {comp.distanceMiles === null
                  ? "Distance unavailable"
                  : `${comp.distanceMiles.toFixed(1)} miles away`}{" "}
                · {comp.listingStatus ?? "Listing status unavailable"}
              </small>
              {comp.lastSeenAt ? <small>Observed {homeDate(comp.lastSeenAt)}</small> : null}
            </Card>
          ))}
        </div>
        {!valuation.comparables.length ? (
          <p className={styles.note}>No comparable listings were supplied for this report.</p>
        ) : null}
      </section>
      <section className={`${styles.reportSection} ${styles.screenOnly}`}>
        <div className={styles.sectionHeading}>
          <h3>Explore the possibilities</h3>
          <p>
            Change the assumptions to understand the numbers. These are hypothetical illustrations.
          </p>
        </div>
        <div className={styles.reportColumns}>
          <Card padding="md" className={styles.scenario}>
            <span className={styles.iconTile}>
              <Icon name="home" decorative />
            </span>
            <h4>After a possible sale</h4>
            <TextField
              label="Illustrative selling costs (%)"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
            <strong>
              {financials.totalDebtMinor !== null && validCost
                ? homeMoney(
                    estimatedSaleProceeds(
                      valuation.valueMinor,
                      financials.totalDebtMinor,
                      Number(cost),
                    ),
                  )
                : "Unavailable"}
            </strong>
            <p>
              Estimated value minus supplied debt and your assumed selling costs. Taxes, repairs and
              actual fees may change the result.
            </p>
          </Card>
          <Card padding="md" className={styles.scenario}>
            <span className={styles.iconTile}>
              <Icon name="layers" decorative />
            </span>
            <h4>Hypothetical borrowing room</h4>
            <TextField
              label="Illustrative maximum loan-to-value (%)"
              type="number"
              min="1"
              max="100"
              value={ltv}
              onChange={(event) => setLtv(event.target.value)}
            />
            <strong>
              {financials.totalDebtMinor !== null && validLtv
                ? homeMoney(
                    hypotheticalBorrowingRoom(
                      valuation.valueMinor,
                      financials.totalDebtMinor,
                      Number(ltv),
                    ),
                  )
                : "Unavailable"}
            </strong>
            <p>
              A calculation using your chosen limit and existing debt. It is not an available credit
              line, loan offer or eligibility decision.
            </p>
          </Card>
        </div>
      </section>
      <section className={styles.assumptions}>
        <h3>Know what is behind the numbers</h3>
        <dl className={styles.dataRows}>
          <div>
            <dt>Valuation source</dt>
            <dd>{valuation.source === "sample" ? "Fictional demonstration data" : "RentCast"}</dd>
          </div>
          <div>
            <dt>Mortgage information</dt>
            <dd>{labels[input.mortgage.source]}</dd>
          </div>
          <div>
            <dt>Mortgage information date</dt>
            <dd>{homeDate(input.mortgage.asOf)}</dd>
          </div>
        </dl>
        {input.mortgage.loan ? (
          <p>
            Balance estimated from {homeMoney(input.mortgage.loan.originalPrincipalMinor)} original
            loan amount, {input.mortgage.loan.annualRatePercent}% fixed interest, a{" "}
            {input.mortgage.loan.termMonths}-month term and {input.mortgage.loan.paymentsMade}{" "}
            completed payments. Extra repayments, missed payments, modifications and fees are
            excluded.
          </p>
        ) : null}
        <p>
          This report is informational and relies on estimates and supplied inputs. It is not an
          appraisal, payoff statement, loan offer, credit decision or financial recommendation.
          Actual property value, balances and loan terms require verification. Equal Housing
          Opportunity.
        </p>
      </section>
      <footer className={styles.reportContact}>
        <span className={styles.brandMark}>
          <Icon name="users" decorative />
        </span>
        <div>
          <strong>{input.brand.name}</strong>
          <p>{input.brand.company}</p>
          <small>
            {[
              input.brand.phone,
              input.brand.email,
              input.brand.nmls ? `NMLS ${input.brand.nmls}` : "",
              input.brand.companyNmls ? `Company NMLS ${input.brand.companyNmls}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </div>
      </footer>
    </article>
  );
}
