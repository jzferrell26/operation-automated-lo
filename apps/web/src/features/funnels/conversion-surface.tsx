"use client";

import { Button, Dialog, FormField, Icon, TextField, Link } from "@oalo/ui";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { adBrandColorValue } from "../workspace/ad-brand.js";
import type { FunnelBrand, FunnelFields, FunnelKind, FunnelStep } from "./model.js";
import { safeDestination } from "./model.js";
import { funnelDefinition } from "./catalog.js";
import { eventLabel, googleCalendarLink, previewCalendar } from "./calendar.js";
import { FunnelImage, FunnelVideo, type PhotoSlot } from "./conversion-media.js";
import { salesContent } from "./sales-content.js";
import { FunnelVisitorSchema, type FunnelCapture, type FunnelVisitor } from "./visitor-model.js";
import styles from "./conversion.module.css";

export interface SurfaceProps {
  readonly kind: FunnelKind;
  readonly fields: FunnelFields;
  readonly brand: FunnelBrand;
  readonly step: FunnelStep;
  readonly onStep: (step: FunnelStep) => void;
  readonly onPhoto?: (slot: PhotoSlot) => void;
  readonly compact?: boolean;
  /** Only the published route supplies the real, server-confirmed capture operation. */
  readonly capture?: FunnelCapture;
  readonly published?: boolean;
}
function Highlight({ text, accent }: Readonly<{ text: string; accent: string }>) {
  const index = accent ? text.toLocaleLowerCase().indexOf(accent.toLocaleLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span>{text.slice(index, index + accent.length)}</span>
      {text.slice(index + accent.length)}
    </>
  );
}
const BUYER_GOALS = [
  ["first-home", "My first home", "Start with the basics", "home"],
  ["buy-soon", "Ready to buy", "Explore the next steps", "home"],
  ["buy-later", "Planning ahead", "Prepare before you shop", "calendar"],
] as const;
const REFI_GOALS = [
  ["payment", "Review my payment", "Explore the full cost", "chart"],
  ["equity", "Explore my equity", "Understand cash-out options", "home"],
  ["term", "Revisit my loan term", "Consider the payoff timeline", "clock"],
] as const;

export function FunnelSurface({
  kind,
  fields,
  brand,
  step,
  onStep,
  onPhoto,
  compact = false,
  capture,
  published = false,
}: SurfaceProps) {
  const definition = funnelDefinition(kind);
  const sales = salesContent(kind, fields);
  const [formOpen, setFormOpen] = useState(false);
  const [goal, setGoal] = useState<FunnelVisitor["goal"]>(
    kind === "lead-magnet"
      ? "guide"
      : kind === "buyer" || kind === "refinance"
        ? "compare"
        : "learn",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const pending = useRef(false);
  const Header = compact ? "h3" : published ? "h1" : "h2";
  const name = brand.name || "Your mortgage adviser";
  const next = definition.steps[1]?.id ?? "book";
  const openForm = () => {
    setError("");
    setFormOpen(true);
  };
  const cta = (label = fields.cta, className = "") => (
    <Button
      type="button"
      variant="secondary"
      className={`${styles.cta} ${className}`}
      onClick={openForm}
    >
      {label}
      <Icon decorative name="arrow-right" size="sm" />
    </Button>
  );
  const benefits = [
    [fields.benefitOneTitle, fields.benefitOneText],
    [fields.benefitTwoTitle, fields.benefitTwoText],
    [fields.benefitThreeTitle, fields.benefitThreeText],
  ];
  const problems = [
    [sales.problemOneTitle, sales.problemOneText],
    [sales.problemTwoTitle, sales.problemTwoText],
    [sales.problemThreeTitle, sales.problemThreeText],
    [sales.problemFourTitle, sales.problemFourText],
  ];
  const proof = sales.proofPermissionConfirmed && sales.quoteText && sales.quoteName;
  const formTitle = sales.formTitle || fields.offerTitle;
  function destination(url: string, label: string, className = "") {
    return url && safeDestination(url) ? (
      <Link className={`${styles.cta} ${className}`} href={url} external>
        {label}
      </Link>
    ) : (
      <div className={styles.missing}>
        <span>
          {published
            ? "This link is currently unavailable. Please contact the presenter."
            : "Add the destination in Links and event details."}
        </span>
      </div>
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !capture) return;
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    const parsed = FunnelVisitorSchema.safeParse({
      requestId: requestId.current,
      firstName: form.get("firstName"),
      email: form.get("email"),
      phone: form.get("phone") ?? "",
      goal,
      consent: form.get("consent") === "on",
      website: form.get("website") ?? "",
    });
    if (!parsed.success) {
      setError("Check your name, email and permission to respond before continuing.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await capture(parsed.data);
      if (result.accepted !== true) throw new Error("Not accepted");
      setFormOpen(false);
      onStep(next);
    } catch {
      setError(
        "Your request could not be confirmed. Your details are still here. Please try again; the same request will not be submitted twice.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const form = (
    <form className={styles.captureForm} onSubmit={(event) => void submit(event)}>
      {error ? (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      ) : null}
      <fieldset disabled={busy || !capture}>
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          maxLength={100}
          requirement="required"
          placeholder="Your first name"
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          requirement="required"
          placeholder="you@example.com"
        />
        <TextField
          label="Phone number (optional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="Your phone number"
        />
        <div className={styles.honey} aria-hidden="true">
          <input
            type="hidden"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            aria-label="Leave this field blank"
          />
        </div>
        <FormField
          label={`I agree that ${brand.company || "the mortgage team"} may use this information to respond to my request.`}
        >
          {(control) => <input {...control} name="consent" type="checkbox" required />}
        </FormField>
      </fieldset>
      {sales.privacyUrl ? (
        <p className={styles.formFine}>
          Read our{" "}
          <Link href={sales.privacyUrl} external>
            Privacy Policy
          </Link>
          . This does not sign you up for automated marketing texts.
        </p>
      ) : null}
      {capture ? (
        <Button type="submit" className={styles.cta} disabled={busy}>
          {busy ? "Confirming your request…" : fields.cta}
          <Icon decorative name="arrow-right" size="sm" />
        </Button>
      ) : (
        <>
          <p className={styles.formFine}>
            Form preview only. Personal details are disabled; this does not submit a registration or
            create a lead.
          </p>
          <Button
            type="button"
            className={styles.cta}
            onClick={() => {
              setFormOpen(false);
              onStep(next);
            }}
          >
            Continue preview
            <Icon decorative name="arrow-right" size="sm" />
          </Button>
        </>
      )}
      <p className={styles.formFine}>
        <Icon decorative name="lock" size="sm" />
        No loan application or credit check is performed by this form.
      </p>
    </form>
  );

  function presenter(): ReactNode {
    return (
      <section
        className={`${styles.presenter} ${!fields.hostPhoto ? styles.presenterWithoutPhoto : ""}`}
      >
        {fields.hostPhoto || onPhoto ? (
          <FunnelImage
            fields={fields}
            kind={kind}
            slot="hostPhoto"
            {...(onPhoto ? { edit: onPhoto } : {})}
            className={styles.presenterPhoto}
          />
        ) : (
          <div className={styles.adviserMonogram} aria-hidden="true">
            {name
              .split(/\s+/u)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </div>
        )}
        <div>
          <p className={styles.eyebrow}>{sales.presenterRole || "Meet your mortgage adviser"}</p>
          <h3 aria-level={published ? 2 : undefined}>Meet {name}.</h3>
          <p className={styles.credentials}>
            {brand.company}
            {brand.nmls ? ` · NMLS ${brand.nmls}` : ""}
          </p>
          <p>{fields.hostBio}</p>
          {sales.presenterCredentials ? (
            <p className={styles.credentialNote}>{sales.presenterCredentials}</p>
          ) : null}
          {cta()}
        </div>
      </section>
    );
  }
  function faq(): ReactNode {
    return (
      <section className={styles.faq}>
        <div>
          <p className={styles.eyebrow}>A FEW THINGS WORTH KNOWING</p>
          <h3 aria-level={published ? 2 : undefined}>
            Good questions.
            <br />
            Straight answers.
          </h3>
        </div>
        <div>
          {[
            [fields.faqOneQuestion, fields.faqOneAnswer],
            [fields.faqTwoQuestion, fields.faqTwoAnswer],
            [fields.faqThreeQuestion, fields.faqThreeAnswer],
          ]
            .filter(([q, a]) => q && a)
            .map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Icon decorative name="plus" size="sm" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
        </div>
      </section>
    );
  }
  function closeOffer(): ReactNode {
    return (
      <section className={styles.closeOffer}>
        <p className={styles.eyebrow}>
          {kind === "live-webinar" ? "YOUR FIRST HOME STARTS HERE" : fields.offerTitle}
        </p>
        <h3 aria-level={published ? 2 : undefined}>{fields.finalTitle}</h3>
        <p>{fields.finalText || sales.solutionText}</p>
        {cta()}
        <span>
          {kind === "live-webinar"
            ? eventLabel(fields)
            : "A request for information. Not a commitment to borrow."}
        </span>
      </section>
    );
  }
  function goalCard(): ReactNode {
    return (
      <div className={styles.goalCard} data-inquiry-goals="">
        <span className={styles.cardKicker}>LET'S START WITH YOU</span>
        <h3 aria-level={published ? 2 : undefined}>{formTitle}</h3>
        <p>{sales.formNote}</p>
        <div className={styles.goalChoices}>
          {(kind === "refinance" ? REFI_GOALS : BUYER_GOALS).map(([value, label, note, icon]) => (
            <Button
              variant="secondary"
              key={value}
              type="button"
              className={goal === value ? styles.goalSelected : ""}
              aria-pressed={goal === value}
              onClick={() => setGoal(value)}
            >
              <Icon decorative name={icon} />
              <span>
                <strong>{label}</strong>
                <small>{note}</small>
              </span>
              <Icon decorative name="chevron-right" size="sm" />
            </Button>
          ))}
        </div>
        {cta()}
        <span className={styles.formFine}>
          No credit check. This is an inquiry, not a loan application.
        </span>
      </div>
    );
  }
  const headline = (
    <Header className={styles.headline} tabIndex={-1}>
      <Highlight text={fields.headline} accent={sales.headlineAccent} />
    </Header>
  );
  return (
    <>
      <article
        className={styles.surface}
        style={{ "--f-brand": adBrandColorValue(brand.colorPresetId) } as CSSProperties}
        data-funnel={kind}
        data-step={step}
        data-funnel-surface=""
        aria-label={`${definition.name}: ${definition.steps.find((item) => item.id === step)?.label ?? step}`}
      >
        <header className={styles.brandBar}>
          <span className={styles.brand}>
            <span className={styles.brandMark}>
              <Icon decorative name="home" size="sm" />
            </span>
            {brand.company || "Your mortgage team"}
          </span>
          <div>
            <span className={styles.headerDescriptor}>
              {kind === "live-webinar"
                ? "Live homebuyer education"
                : kind === "on-demand"
                  ? "Homebuyer education, on your schedule"
                  : "A personal approach to your mortgage"}
            </span>
            {step === "landing" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={openForm}
                className={styles.headerCta}
              >
                {fields.cta}
                <span aria-hidden="true">→</span>
              </Button>
            ) : null}
          </div>
        </header>
        {step === "landing" ? (
          <>
            {kind === "live-webinar" ? (
              <section className={styles.webinarHero} data-layout="webinar-registration">
                <p className={styles.eyebrow}>{fields.eyebrow}</p>
                {headline}
                <p className={styles.description}>{fields.description}</p>
                <div className={styles.heroCta}>
                  {cta()}
                  <span>
                    <Icon decorative name="calendar" size="sm" />
                    {eventLabel(fields)}
                    <b aria-hidden="true">·</b>
                    {fields.eventDurationMinutes} minutes
                  </span>
                </div>
                <div className={styles.webinarMedia}>
                  <FunnelVideo
                    fields={fields}
                    kind={kind}
                    url={sales.invitationVideoUrl}
                    invitation
                    {...(onPhoto ? { edit: onPhoto } : {})}
                  />
                  <div className={styles.mediaFooter}>
                    <span>
                      <Icon decorative name="monitor" />
                      Online workshop
                    </span>
                    <span>
                      <Icon decorative name="users" />
                      {name}
                    </span>
                    <span>
                      <Icon decorative name="help" />
                      Bring your questions
                    </span>
                  </div>
                </div>
              </section>
            ) : kind === "on-demand" ? (
              <section className={styles.onDemandHero} data-layout="on-demand-access">
                <div>
                  <p className={styles.eyebrow}>{fields.eyebrow}</p>
                  {headline}
                  <p className={styles.description}>{fields.description}</p>
                  {cta()}
                  <p className={styles.heroNote}>
                    Watch the workshop. Then put it to work for you.
                  </p>
                </div>
                <div className={styles.recordingCover}>
                  <FunnelVideo
                    fields={fields}
                    kind={kind}
                    url={sales.invitationVideoUrl}
                    invitation
                    {...(onPhoto ? { edit: onPhoto } : {})}
                  />
                  <div className={styles.recordingLabel}>
                    <Icon decorative name="monitor" />
                    <span>
                      <strong>ON YOUR TIME. AT YOUR PACE.</strong>Get access to the full homebuyer
                      workshop.
                    </span>
                  </div>
                </div>
              </section>
            ) : kind === "lead-magnet" ? (
              <section className={styles.guideHero} data-layout="resource-offer">
                <div>
                  <p className={styles.eyebrow}>{fields.eyebrow}</p>
                  {headline}
                  <p className={styles.description}>{fields.description}</p>
                  <ul className={styles.quickChecks}>
                    {benefits.map(([title]) => (
                      <li key={title}>
                        <Icon decorative name="check" size="sm" />
                        {title}
                      </li>
                    ))}
                  </ul>
                  {cta()}
                  <p className={styles.heroNote}>
                    A practical resource to keep, not another thing to figure out.
                  </p>
                </div>
                <div className={styles.guideVisual}>
                  {fields.heroPhoto ? (
                    <FunnelImage
                      fields={fields}
                      kind={kind}
                      {...(onPhoto ? { edit: onPhoto } : {})}
                    />
                  ) : (
                    <div className={styles.guideStack}>
                      <div className={styles.guidePage}>
                        <span>YOUR HOME PURCHASE CHECKLIST</span>
                        {problems.map(([title]) => (
                          <p key={title}>□ {title}</p>
                        ))}
                      </div>
                      <div className={styles.guideBook}>
                        <span>THE HOMEBUYER RESOURCE</span>
                        <strong>{fields.offerTitle}</strong>
                        <div className={styles.coverRule} />
                        <p>
                          What to know.
                          <br />
                          What to ask.
                          <br />
                          What comes next.
                        </p>
                        <small>{brand.company || "Your mortgage team"}</small>
                      </div>
                      {onPhoto ? (
                        <Button
                          className={styles.guideEdit}
                          variant="secondary"
                          type="button"
                          onClick={() => onPhoto("heroPhoto")}
                        >
                          <Icon decorative name="image" size="sm" />
                          Replace cover photo
                        </Button>
                      ) : null}
                    </div>
                  )}
                  <p className={styles.guideCaption}>
                    Designed to make your next conversation count.
                  </p>
                </div>
              </section>
            ) : (
              <section
                className={`${styles.inquiryHero} ${kind === "refinance" ? styles.refiHero : styles.buyerHero}`}
                data-layout={kind === "refinance" ? "refinance-inquiry" : "buyer-inquiry"}
              >
                <div className={styles.inquiryWords}>
                  <p className={styles.eyebrow}>{fields.eyebrow}</p>
                  {headline}
                  <p className={styles.description}>{fields.description}</p>
                  <div className={styles.inquiryAssurance}>
                    <span>
                      <Icon decorative name="users" />
                      Personal guidance
                    </span>
                    <span>
                      <Icon decorative name="shield" />
                      No obligation to apply
                    </span>
                  </div>
                  <FunnelImage
                    fields={fields}
                    kind={kind}
                    {...(onPhoto ? { edit: onPhoto } : {})}
                    className={styles.inquiryPhoto}
                  />
                </div>
                {goalCard()}
              </section>
            )}

            {kind === "live-webinar" ? (
              <>
                <section className={styles.story}>
                  <div>
                    <p className={styles.eyebrow}>FROM RENTING TO YOUR NEXT CHAPTER</p>
                    <h3 aria-level={published ? 2 : undefined}>{sales.storyTitle}</h3>
                    <p>{sales.storyText}</p>
                    {cta()}
                  </div>
                  <div className={styles.learningCard}>
                    <span className={styles.cardKicker}>WHAT WE WILL WALK THROUGH</span>
                    {benefits.map(([title, text], index) => (
                      <div className={styles.lesson} key={title}>
                        <span>0{index + 1}</span>
                        <div>
                          <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                          <p>{text}</p>
                        </div>
                      </div>
                    ))}
                    <p className={styles.learningFooter}>
                      <Icon decorative name="help" />
                      Plus time for the questions on your mind.
                    </p>
                  </div>
                </section>
                <section className={styles.problemSection}>
                  <div className={styles.sectionHeading}>
                    <p className={styles.eyebrow}>YOU ARE NOT THE ONLY ONE ASKING</p>
                    <h3 aria-level={published ? 2 : undefined}>{sales.problemTitle}</h3>
                  </div>
                  <div className={styles.problemGrid}>
                    {problems.map(([title, text], index) => (
                      <div key={title}>
                        <span className={styles.problemNumber}>0{index + 1}</span>
                        <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                  <div className={styles.solution}>
                    <div>
                      <h3 aria-level={published ? 2 : undefined}>{sales.solutionTitle}</h3>
                      <p>{sales.solutionText}</p>
                    </div>
                    {cta()}
                  </div>
                </section>
              </>
            ) : kind === "on-demand" ? (
              <section className={styles.curriculum}>
                <div>
                  <p className={styles.eyebrow}>INSIDE THE WORKSHOP</p>
                  <h3 aria-level={published ? 2 : undefined}>{fields.sectionTitle}</h3>
                  <p>{sales.storyText}</p>
                </div>
                <div>
                  {benefits.map(([title, text], index) => (
                    <div className={styles.chapter} key={title}>
                      <span>0{index + 1}</span>
                      <div>
                        <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                        <p>{text}</p>
                      </div>
                      <Icon decorative name="circle-check" />
                    </div>
                  ))}
                </div>
              </section>
            ) : kind === "lead-magnet" ? (
              <section className={styles.guideInside}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrow}>OPEN THE GUIDE. CLOSE THE KNOWLEDGE GAP.</p>
                  <h3 aria-level={published ? 2 : undefined}>{sales.storyTitle}</h3>
                  <p>{sales.storyText}</p>
                </div>
                <div className={styles.guideContents}>
                  {problems.map(([title, text], index) => (
                    <div key={title}>
                      <span className={styles.chapterNumber}>0{index + 1}</span>
                      <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <>
                <section className={styles.mortgageStory}>
                  <div>
                    <p className={styles.eyebrow}>
                      {kind === "refinance"
                        ? "MORE THAN A HEADLINE RATE"
                        : "MORE CONFIDENCE. FEWER UNKNOWNS."}
                    </p>
                    <h3 aria-level={published ? 2 : undefined}>{sales.storyTitle}</h3>
                    <p>{sales.storyText}</p>
                    {cta()}
                  </div>
                  <div className={styles.checklistCard}>
                    {problems.map(([title, text]) => (
                      <div key={title}>
                        <Icon decorative name="circle-check" />
                        <div>
                          <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                          <p>{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={styles.processSection}>
                  <div className={styles.sectionHeading}>
                    <p className={styles.eyebrow}>HERE IS HOW IT WORKS</p>
                    <h3 aria-level={published ? 2 : undefined}>{fields.sectionTitle}</h3>
                  </div>
                  <div className={styles.processGrid}>
                    {benefits.map(([title, text], index) => (
                      <div key={title}>
                        <span>0{index + 1}</span>
                        <h4 aria-level={published ? 3 : undefined}>{title}</h4>
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            {presenter()}
            {proof ? (
              <section className={styles.proof}>
                <p className={styles.eyebrow}>IN THEIR OWN WORDS</p>
                <blockquote>“{sales.quoteText}”</blockquote>
                <strong>{sales.quoteName}</strong>
                {sales.quoteContext ? <span>{sales.quoteContext}</span> : null}
              </section>
            ) : null}
            {faq()}
            {closeOffer()}
          </>
        ) : (
          <section className={styles.followPage}>
            <div className={styles.followHeading}>
              <span className={styles.followIcon}>
                <Icon
                  decorative
                  name={
                    step === "watch" ? "monitor" : step === "book" ? "calendar" : "circle-check"
                  }
                  size="lg"
                />
              </span>
              <p className={styles.eyebrow}>{fields.offerTitle}</p>
              <Header className={styles.headline} tabIndex={-1}>
                {step === "book"
                  ? fields.bookingTitle
                  : step === "thanks"
                    ? fields.thanksTitle
                    : fields.confirmationTitle}
              </Header>
              <p className={styles.description}>
                {step === "book"
                  ? fields.bookingText
                  : step === "thanks"
                    ? fields.thanksText
                    : fields.confirmationText}
              </p>
            </div>
            {step === "confirmation" ? (
              <div className={styles.confirmationGrid}>
                <div className={styles.calendarCard}>
                  <span className={styles.cardKicker}>YOUR WEBINAR DETAILS</span>
                  <h3 aria-level={published ? 2 : undefined}>{fields.offerTitle}</h3>
                  <p>
                    <Icon decorative name="calendar" />
                    {eventLabel(fields)}
                  </p>
                  <p>
                    <Icon decorative name="clock" />
                    {fields.eventDurationMinutes} minutes · Online
                  </p>
                  <div className={styles.calendarActions}>
                    {googleCalendarLink(fields, Date.now(), published) ? (
                      <>
                        <Link
                          href={googleCalendarLink(fields, Date.now(), published)!}
                          className={styles.cta}
                          external
                        >
                          Google Calendar
                        </Link>
                        <Button
                          type="button"
                          variant="secondary"
                          className={styles.outline}
                          onClick={() => {
                            const content = previewCalendar(fields, Date.now(), published);
                            if (!content) return;
                            const url = URL.createObjectURL(
                              new Blob([content], { type: "text/calendar;charset=utf-8" }),
                            );
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = published ? "webinar.ics" : "webinar-preview.ics";
                            link.click();
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          }}
                        >
                          Apple / Outlook (.ics)
                          <Icon decorative name="download" size="sm" />
                        </Button>
                      </>
                    ) : (
                      <p>
                        {published
                          ? "Contact the presenter for the updated event time."
                          : "Set the event date to enable calendar actions."}
                      </p>
                    )}
                  </div>
                  {published ? destination(fields.webinarUrl, "Open webinar join link") : null}
                </div>
                <div className={styles.nextSteps}>
                  <h3 aria-level={published ? 2 : undefined}>Make the most of your session.</h3>
                  <ol>
                    <li>
                      <strong>Add it to your calendar.</strong>
                      <p>Keep the date and joining details handy.</p>
                    </li>
                    <li>
                      <strong>Bring your questions.</strong>
                      <p>
                        Down payment, credit, monthly payment, closing costs. Nothing is too basic.
                      </p>
                    </li>
                    <li>
                      <strong>Give yourself a little space.</strong>
                      <p>Find a quiet spot and something to take notes with.</p>
                    </li>
                  </ol>
                </div>
              </div>
            ) : null}
            {step === "watch" ? (
              <>
                <FunnelVideo fields={fields} kind={kind} url={fields.videoUrl} />
                <div className={styles.watchNext}>
                  <div>
                    <p className={styles.eyebrow}>TURN WHAT YOU LEARN INTO YOUR NEXT STEP</p>
                    <h3 aria-level={published ? 2 : undefined}>{fields.bookingTitle}</h3>
                    <p>{fields.bookingText}</p>
                  </div>
                  <Button
                    className={styles.cta}
                    variant="secondary"
                    type="button"
                    onClick={() => onStep("book")}
                  >
                    Book a call
                    <Icon decorative name="arrow-right" size="sm" />
                  </Button>
                </div>
              </>
            ) : null}
            {step === "book" ? (
              <div className={styles.bookingGrid}>
                {kind === "lead-magnet" ? (
                  <div className={styles.resourceCard}>
                    <Icon decorative name="file-text" size="lg" />
                    <h3 aria-level={published ? 2 : undefined}>{fields.offerTitle}</h3>
                    <p>
                      Your resource is the starting point. A conversation can help you apply it to
                      your plans.
                    </p>
                    {destination(fields.resourceUrl, "Download the guide")}
                  </div>
                ) : (
                  <div className={styles.bookingPerson}>
                    {fields.hostPhoto ? (
                      <FunnelImage fields={fields} kind={kind} slot="hostPhoto" />
                    ) : null}
                    <h3 aria-level={published ? 2 : undefined}>{name}</h3>
                    <p>{brand.company}</p>
                    <p>{fields.hostBio}</p>
                  </div>
                )}
                <div className={styles.bookingCard}>
                  <span className={styles.cardKicker}>LET'S TALK ABOUT YOUR GOALS</span>
                  <h3 aria-level={published ? 2 : undefined}>Choose a time that works for you.</h3>
                  <ul className={styles.quickChecks}>
                    <li>
                      <Icon decorative name="check" />
                      Bring your questions
                    </li>
                    <li>
                      <Icon decorative name="check" />
                      Discuss your next steps
                    </li>
                    <li>
                      <Icon decorative name="check" />
                      Get a personal point of view
                    </li>
                  </ul>
                  {destination(fields.bookingUrl, "Open booking calendar")}
                  <p className={styles.formFine}>
                    Your appointment is confirmed by the scheduling service after you choose a time.
                  </p>
                  {definition.steps.some((item) => item.id === "thanks") ? (
                    <Button
                      variant="secondary"
                      className={styles.textLink}
                      type="button"
                      onClick={() => onStep("thanks")}
                    >
                      {published ? "Return to my request" : "Preview thank-you page"}
                      <span aria-hidden="true">→</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {step === "thanks" ? (
              <div className={styles.thanksCard}>
                <h3 aria-level={published ? 2 : undefined}>
                  {published ? "Your request has been received." : "Thank-you page preview"}
                </h3>
                <p>
                  {published
                    ? "Keep any event or resource information from the previous page. If you chose an appointment, your scheduling service provides its confirmation."
                    : "A preview does not submit a request or confirm an appointment."}
                </p>
                {destination(
                  kind === "lead-magnet" ? fields.resourceUrl : fields.bookingUrl,
                  kind === "lead-magnet" ? "Open the guide" : "Open booking calendar",
                )}
              </div>
            ) : null}
          </section>
        )}
        <footer className={styles.footer}>
          <div>
            <strong>{brand.company || "Your mortgage team"}</strong>
            <span>
              {name}
              {brand.nmls ? ` · NMLS ${brand.nmls}` : ""}
              {brand.companyNmls ? ` · Company NMLS ${brand.companyNmls}` : ""}
            </span>
          </div>
          <p>
            {brand.disclosure ||
              "This is not a commitment to lend. Complete the lender disclosures before publication."}
          </p>
          <nav aria-label="Funnel policies">
            {sales.privacyUrl ? (
              <Link href={sales.privacyUrl} external>
                Privacy Policy
              </Link>
            ) : null}
            {sales.termsUrl ? (
              <Link href={sales.termsUrl} external>
                Terms of Use
              </Link>
            ) : null}
          </nav>
          {!published ? (
            <p className={styles.previewNote}>
              Private preview. No registration, inquiry or appointment is created from preview
              navigation.
            </p>
          ) : null}
        </footer>
        {step === "landing" && !compact ? <div className={styles.mobileAction}>{cta()}</div> : null}
      </article>
      <Dialog
        open={formOpen}
        onClose={() => {
          if (!busy) setFormOpen(false);
        }}
        title={formTitle}
        description={sales.formNote}
      >
        {form}
      </Dialog>
    </>
  );
}
