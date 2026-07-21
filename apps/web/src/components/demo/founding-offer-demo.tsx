import {
  foundingOffer,
  proofSurfaces,
  walkthroughSteps,
  type DemoDeliveryMode,
} from "../../demo/founding-offer-fixture.js";

import styles from "./founding-offer-demo.module.css";

type ModeBadgeProps = {
  mode: DemoDeliveryMode;
};

function ModeBadge({ mode }: ModeBadgeProps) {
  return <span className={styles[`mode${mode.replace("-", "")}`]}>{mode}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PropertyInputSurface() {
  return (
    <article className={`${styles.surface} ${styles.inputSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>01 / Input</p>
          <h3>Juniper Lane open house</h3>
        </div>
        <ModeBadge mode="Manual" />
      </div>
      <div className={styles.propertyGrid}>
        <div>
          <span>Address</span>
          <strong>314 Juniper Lane</strong>
        </div>
        <div>
          <span>Event</span>
          <strong>Sunday · 1-3 PM</strong>
        </div>
        <div>
          <span>Realtor</span>
          <strong>Maya Chen</strong>
        </div>
        <div>
          <span>Loan officer</span>
          <strong>Jordan Ellis</strong>
        </div>
      </div>
      <p className={styles.surfaceNote}>
        Entered, reviewed, and attested by the founding account. This demo contains no real property
        or customer data.
      </p>
    </article>
  );
}

function PublicPageSurface() {
  return (
    <article className={`${styles.surface} ${styles.pageSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>02 / Public page</p>
          <h3>A campaign page that stays on-message</h3>
        </div>
        <ModeBadge mode="Automated" />
      </div>
      <div className={styles.pagePreview}>
        <div className={styles.browserBar}>
          <span />
          <span />
          <span />
          <code>preview.automatedlo.test/juniper</code>
        </div>
        <div className={styles.houseImage}>
          <span>Representative property image</span>
        </div>
        <div className={styles.pageCopy}>
          <p>OPEN HOUSE · SUNDAY 1-3 PM</p>
          <h4>Room to host, grow, and settle in.</h4>
          <span>Presented by Maya Chen and Jordan Ellis</span>
          <button type="button" disabled>
            Get open-house details
          </button>
        </div>
      </div>
      <p className={styles.surfaceNote}>
        Synthetic page preview only. The disabled control does not submit a lead or call a provider.
      </p>
    </article>
  );
}

function ArtifactSurface() {
  return (
    <article className={`${styles.surface} ${styles.artifactSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>03 / Artifacts</p>
          <h3>One campaign, three usable formats</h3>
        </div>
        <ModeBadge mode="Automated" />
      </div>
      <div className={styles.artifactGrid}>
        <div className={styles.flyer}>
          <p>JUNIPER LANE</p>
          <strong>OPEN HOUSE</strong>
          <span>Sunday · 1-3 PM</span>
        </div>
        <div className={styles.creative}>
          <span>Social creative</span>
          <strong>Sunday at Juniper Lane</strong>
        </div>
        <div className={styles.qr}>
          <span>QR destination</span>
          <div className={styles.qrBlocks} aria-hidden="true">
            ▦ ▣ ▦<br />▣ ▦ ▣<br />▦ ▣ ▦
          </div>
        </div>
      </div>
      <p className={styles.surfaceNote}>
        These are locally rendered placeholders, not production PDFs, images, or public URLs.
      </p>
    </article>
  );
}

function ApprovalSurface() {
  return (
    <article className={`${styles.surface} ${styles.approvalSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>04 / Approval</p>
          <h3>Generation is never publication</h3>
        </div>
        <ModeBadge mode="Manual" />
      </div>
      <div className={styles.approvalCard}>
        <div className={styles.checkmark} aria-hidden="true">
          ✓
        </div>
        <div>
          <p>Version v0.3 · illustrative fixture</p>
          <strong>Ready for named review</strong>
          <span>Approver, disclosure, and campaign facts are explicit checkpoints.</span>
        </div>
        <span className={styles.pending}>Not a live approval</span>
      </div>
      <p className={styles.surfaceNote}>
        A person, not the demo, makes approval decisions. No approval is recorded here.
      </p>
    </article>
  );
}

function MetaSurface() {
  return (
    <article className={`${styles.surface} ${styles.metaSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>05 / Launch walkthrough</p>
          <h3>Review the draft before a launch</h3>
        </div>
        <ModeBadge mode="Manual" />
      </div>
      <div className={styles.metaRows}>
        <p>
          <span>Objective</span>
          <strong>Open house awareness</strong>
        </p>
        <p>
          <span>Budget</span>
          <strong>Not set in demo</strong>
        </p>
        <p>
          <span>Audience</span>
          <strong>Review required</strong>
        </p>
        <p>
          <span>Launch state</span>
          <strong className={styles.noSpend}>Sandbox illustration · no spend</strong>
        </p>
      </div>
      <p className={styles.surfaceNote}>
        No Meta account, ad draft, publication, or spend exists behind this view. External launch
        contracts remain unvalidated.
      </p>
    </article>
  );
}

function GhlRoutingSurface() {
  return (
    <article className={`${styles.surface} ${styles.routeSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>06 / GHL lead routing</p>
          <h3>Show where a synthetic lead would go</h3>
        </div>
        <ModeBadge mode="Automated" />
      </div>
      <div className={styles.routeFlow}>
        <span>Public page</span>
        <i aria-hidden="true">→</i>
        <span>Consent</span>
        <i aria-hidden="true">→</i>
        <span>Synthetic lead</span>
        <i aria-hidden="true">→</i>
        <span>GHL contact + pipeline</span>
      </div>
      <p className={styles.surfaceNote}>
        This is a synthetic fixture. The route issues no provider reads or writes and creates no
        contact, tag, opportunity, or workflow event.
      </p>
    </article>
  );
}

function ResultsSurface() {
  return (
    <article className={`${styles.surface} ${styles.resultsSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>07 / Results dashboard</p>
          <h3>Read the campaign story without a reporting spreadsheet</h3>
        </div>
        <ModeBadge mode="Read-only" />
      </div>
      <div className={styles.metrics}>
        <div>
          <span>Illustrative leads</span>
          <strong>18</strong>
        </div>
        <div>
          <span>Appointments</span>
          <strong>6</strong>
        </div>
        <div>
          <span>Applications</span>
          <strong>2</strong>
        </div>
      </div>
      <p className={styles.surfaceNote}>
        Read-only synthetic metrics only. No customer account, provider data, outcome attribution,
        or production dashboard is connected to this view.
      </p>
    </article>
  );
}

function ScopeSurface() {
  return (
    <article className={`${styles.surface} ${styles.scopeSurface}`}>
      <div className={styles.surfaceHeader}>
        <div>
          <p className={styles.surfaceNumber}>08 / Founding offer</p>
          <h3>The promise, capacity, and edges of the offer</h3>
        </div>
        <ModeBadge mode="Manual" />
      </div>
      <div className={styles.offerGrid}>
        <div>
          <span>Founding price</span>
          <strong>{foundingOffer.price}</strong>
          <small>one time</small>
        </div>
        <div>
          <span>Capacity</span>
          <strong>20</strong>
          <small>founding accounts</small>
        </div>
        <div>
          <span>Included</span>
          <strong>90</strong>
          <small>days</small>
        </div>
        <div>
          <span>Then</span>
          <strong>$197</strong>
          <small>per month</small>
        </div>
      </div>
      <div className={styles.policyGrid}>
        <p>
          <strong>Included:</strong> GHL connection, assisted profile, one Open House Boost
          blueprint, page/PDF/creative, campaign text, launch flow, routing, and reporting.
        </p>
        <p>
          <strong>Not included:</strong> {foundingOffer.exclusions.join(", ")}.
        </p>
      </div>
      <p className={styles.refund}>
        <strong>Refund policy:</strong> {foundingOffer.refundPolicy}
      </p>
    </article>
  );
}

export function FoundingOfferDemo() {
  return (
    <main className={styles.demo}>
      <section className={styles.hero} aria-labelledby="demo-title">
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Operation Automated LO · Phase 0 founding demonstration</p>
          <h1 id="demo-title">One property campaign, shown end to end.</h1>
          <p className={styles.heroLead}>
            A bounded, synthetic preview of how a Realtor, property, page, flyer, campaign review,
            lead path, and outcome view fit together inside one operating flow.
          </p>
          <div className={styles.heroActions}>
            <a href="#walkthrough">See the 3-5 minute walkthrough</a>
            <span>Demonstration only · no checkout · no live connections</span>
          </div>
        </div>
        <aside className={styles.statusCard} aria-label="Demo safety status">
          <p>Phase 0 boundary</p>
          <strong>Synthetic local fixtures only</strong>
          <ul>
            <li>No provider fetches or writes</li>
            <li>No customer or property records</li>
            <li>No payment collection or ad spend</li>
            <li>G1-G8 are not validated by this demo</li>
          </ul>
        </aside>
      </section>

      <section id="walkthrough" className={styles.walkthrough} aria-labelledby="walkthrough-title">
        <SectionHeading
          eyebrow="Founder walkthrough"
          title="A visible 4-minute campaign story"
          description="Use this sequence in a 3-5 minute founder conversation. Labels make the handoff between a person and the product explicit."
        />
        <ol className={styles.stepList}>
          {walkthroughSteps.map((step) => (
            <li key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <div>
                <strong>{step.label}</strong>
                <span>{step.duration}</span>
              </div>
              <ModeBadge mode={step.mode} />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.proofIndex} aria-labelledby="proof-title">
        <SectionHeading
          eyebrow="Eight proof surfaces"
          title="Everything a founding buyer needs to inspect"
          description="Each surface below is an illustrated local fixture. It demonstrates the shape of the experience, not a completed production workflow."
        />
        <ol>
          {proofSurfaces.map((surface, index) => (
            <li key={surface.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{surface.title}</strong>
                <p>{surface.caption}</p>
              </div>
              <ModeBadge mode={surface.mode} />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.surfaceStack} aria-label="Founding offer proof surfaces">
        <PropertyInputSurface />
        <PublicPageSurface />
        <ArtifactSurface />
        <ApprovalSurface />
        <MetaSurface />
        <GhlRoutingSurface />
        <ResultsSurface />
        <ScopeSurface />
      </section>

      <footer className={styles.footer}>
        <p>Operation Automated LO · Founding offer demonstration</p>
        <p>
          Local fixture route. No provider writes, payment collection, live campaign launch, or
          customer data.
        </p>
      </footer>
    </main>
  );
}
