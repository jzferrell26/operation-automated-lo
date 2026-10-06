import { Badge, Link, Surface } from "@oalo/ui";
import { FINANCING_COPY as COPY } from "../../copy/financing-messages.js";
import {
  financingDate,
  financingGroups,
  financingMoney,
  programNames,
  quoteWarnings,
} from "./display.js";
import { FINANCING_CREATE_PATH, financingOutputPath, type FinancingReportView } from "./model.js";
import styles from "./financing.module.css";

export function FinancingReport({
  report,
  canReuse = false,
  now = Date.now(),
}: Readonly<{ report: FinancingReportView; canReuse?: boolean; now?: number }>) {
  const { manifest } = report;
  const groups = financingGroups(manifest);
  const scenarios = manifest.financing.scenarios;
  return (
    <div className={styles.page} data-financing-report="">
      <header className={styles.header}>
        <Link href="/marketing/campaigns" variant="sentence">
          {COPY.back}
        </Link>
        <p className={styles.eyebrow}>{COPY.reportTitle}</p>
        <h1>{manifest.property.address}</h1>
        <p className={styles.lead}>{manifest.property.description}</p>
        <div className={styles.actions}>
          <Badge tone="neutral">{COPY.draft}</Badge>
          <Link href={financingOutputPath(report, "site")} external>
            {COPY.website}
          </Link>
          <Link href={financingOutputPath(report, "flyer")}>{COPY.pdf}</Link>
          {canReuse ? (
            <Link href={`${FINANCING_CREATE_PATH}?from=${encodeURIComponent(report.campaignRef)}`}>
              {COPY.repeat}
            </Link>
          ) : null}
        </div>
        <p className={styles.notice}>{COPY.privateNotice}</p>
      </header>
      <section className={styles.summaries} aria-label="Scenario estimates">
        {scenarios.map((scenario, index) => {
          const result = manifest.calculated.scenarios[index];
          if (!result) return null;
          const warnings = quoteWarnings(scenario, now);
          return (
            <Surface padding="lg" key={scenario.id}>
              <div className={styles.summary}>
                <p className={styles.eyebrow}>{programNames[scenario.program]}</p>
                <h2>{scenario.label}</h2>
                <dl>
                  <dt>Monthly housing</dt>
                  <dd className={styles.amount}>{financingMoney(result.totalHousingMinor)}</dd>
                  <dt>Cash at closing</dt>
                  <dd className={styles.cash}>{financingMoney(result.cashToCloseMinor)}</dd>
                </dl>
                {warnings.map((warning) => (
                  <p className={styles.warning} key={warning}>
                    {warning}
                  </p>
                ))}
                {result.missing.length ? <p>{COPY.incomplete}</p> : null}
              </div>
            </Surface>
          );
        })}
      </section>
      <Surface padding="lg">
        <div className={styles.desktopComparison}>
          <table className={styles.comparison}>
            <caption>Financing assumptions, cash to close, and monthly housing expense</caption>
            <thead>
              <tr>
                <th scope="col">Your options</th>
                {scenarios.map((scenario) => (
                  <th key={scenario.id} scope="col">
                    {scenario.label}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.title}>
                <tr className={styles.groupRow}>
                  <th colSpan={scenarios.length + 1} scope="rowgroup">
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className={row.emphasis ? styles.totalRow : undefined}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={scenarios[index]?.id}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <div className={styles.mobileComparison}>
          {scenarios.map((scenario, index) => (
            <section key={scenario.id} className={styles.mobileScenario}>
              <h2>{scenario.label}</h2>
              {groups.map((group) => (
                <section key={group.title}>
                  <h3>{group.title}</h3>
                  <dl>
                    {group.rows.map((row) => (
                      <div key={row.label} className={row.emphasis ? styles.totalRow : undefined}>
                        <dt>{row.label}</dt>
                        <dd>{row.values[index]}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </section>
          ))}
        </div>
        <p className={styles.note}>{COPY.noteMonthly}</p>
        <p className={styles.note}>{COPY.noteCash}</p>
      </Surface>
      <section className={styles.team} aria-label="Your property and lending team">
        {(
          [
            ["Realtor partner", manifest.identities.realtor],
            ["Loan officer", manifest.identities.lender],
          ] as const
        ).map(([label, identity]) => (
          <Surface padding="lg" key={label}>
            <p className={styles.eyebrow}>{label}</p>
            <h2>{identity.name}</h2>
            <p>{identity.company}</p>
            <p>{identity.phone}</p>
            <p>{identity.email}</p>
            {identity.license ? <p>{identity.license}</p> : null}
          </Surface>
        ))}
      </section>
      <Surface padding="lg">
        <h2>Quote inputs and cost details</h2>
        <p>{COPY.noteQuotes}</p>
        <p className={styles.note}>{COPY.dateNote}</p>
        {scenarios.map((scenario) => (
          <details className={styles.details} key={scenario.id}>
            <summary>{scenario.label}: quote and itemized costs</summary>
            <dl className={styles.facts}>
              <div>
                <dt>Quote source</dt>
                <dd>{scenario.quote.source}</dd>
              </div>
              <div>
                <dt>Issued</dt>
                <dd>{financingDate(scenario.quote.quotedAt)}</dd>
              </div>
              <div>
                <dt>Valid until</dt>
                <dd>{financingDate(scenario.quote.expiresAt)}</dd>
              </div>
              <div>
                <dt>Input review</dt>
                <dd>{scenario.quote.confirmed ? COPY.quoteConfirmed : COPY.quoteUnconfirmed}</dd>
              </div>
              <div>
                <dt>Assumptions</dt>
                <dd>{scenario.assumptions || COPY.unknown}</dd>
              </div>
            </dl>
            {scenario.costs.length ? (
              <ul>
                {scenario.costs.map((cost) => (
                  <li key={cost.id}>
                    {cost.label}: {financingMoney(cost.amountMinor)} ({cost.category}
                    {cost.paidBeforeClosing ? "; already paid" : ""})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No itemized costs entered.</p>
            )}
            {!scenario.costsComplete ? <p>Cost list not confirmed complete.</p> : null}
          </details>
        ))}
      </Surface>
      <footer className={styles.footer}>
        <p>
          {manifest.property.permissionConfirmed && manifest.partner.permissionConfirmed
            ? COPY.permissionsRecorded
            : COPY.permissionsMissing}
        </p>
        <p>{manifest.content.disclosureText}</p>
        <p>{COPY.photoNote}</p>
        <p>
          Saved {financingDate(report.createdAt)}. Version {report.versionNo}. Calculation{" "}
          {manifest.calculated.calculationVersion}.
        </p>
        <p>{COPY.privateNotice}</p>
      </footer>
    </div>
  );
}
