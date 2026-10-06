"use client";

import { Icon, Dialog, TextField, Button, Link } from "@oalo/ui";
import { useState, type CSSProperties } from "react";
import { FUNNEL_COPY as COPY } from "../../copy/funnel-messages.js";
import { eventLabel, googleCalendarLink, previewCalendar } from "./calendar.js";
import { funnelDefinition } from "./catalog.js";
import type { FunnelBrand, FunnelFields, FunnelKind, FunnelStep } from "./model.js";
import { safeDestination } from "./model.js";
import styles from "./surface.module.css";
import { webinarEmbed } from "./video.js";
import { adBrandColorValue } from "../workspace/ad-brand.js";

export interface SurfaceProps {
  readonly kind: FunnelKind;
  readonly fields: FunnelFields;
  readonly brand: FunnelBrand;
  readonly step: FunnelStep;
  readonly onStep: (step: FunnelStep) => void;
  readonly onPhoto?: (slot: "heroPhoto" | "hostPhoto") => void;
  readonly compact?: boolean;
}

function Photo({
  fields,
  slot,
  kind,
  onPhoto,
}: Readonly<{
  fields: FunnelFields;
  slot: "heroPhoto" | "hostPhoto";
  kind: FunnelKind;
  onPhoto?: SurfaceProps["onPhoto"];
}>) {
  const photo = fields[slot];
  return (
    <div className={`${styles.photo} ${slot === "hostPhoto" ? styles.portrait : ""}`}>
      {photo ? (
        <img src={photo.dataUrl} alt={photo.alt} loading="lazy" />
      ) : (
        <div
          className={`${styles.art} ${kind === "lead-magnet" && slot === "heroPhoto" ? styles.bookArt : ""}`}
          aria-hidden="true"
        >
          {kind === "lead-magnet" && slot === "heroPhoto" ? (
            <div className={styles.book}>
              <span>THE FIELD NOTES COLLECTION</span>
              <strong>{fields.offerTitle}</strong>
              <i />
              <span>MAKE YOUR NEXT MOVE A CLEARER ONE.</span>
            </div>
          ) : slot === "hostPhoto" ? (
            <div className={styles.hostArt}>
              <Icon decorative name="users" size="lg" />
            </div>
          ) : (
            <>
              <div className={styles.artSun} />
              <div className={styles.arch} />
              <div className={styles.archSecond} />
              <div className={styles.artSteps} />
              <div className={styles.artCaption}>
                <Icon
                  decorative
                  name={kind === "buyer" || kind === "refinance" ? "home" : "monitor"}
                />
                {fields.offerTitle}
              </div>
            </>
          )}
        </div>
      )}
      {onPhoto ? (
        <Button
          variant="secondary"
          type="button"
          className={styles.photoEdit}
          onClick={() => onPhoto(slot)}
        >
          <Icon decorative name="image" size="sm" />
          {slot === "heroPhoto" ? COPY.uploadHero : COPY.uploadHost}
        </Button>
      ) : null}
    </div>
  );
}

function Destination({ url, children }: Readonly<{ url: string; children: string }>) {
  return url && safeDestination(url) ? (
    <Link external className={styles.cta} href={url} referrerPolicy="no-referrer">
      {children}
    </Link>
  ) : (
    <div className={styles.missingAction}>
      <Button variant="secondary" className={styles.cta} type="button" disabled>
        {children}
      </Button>
      <p>{COPY.contentRequired}</p>
    </div>
  );
}

export function FunnelSurface({
  kind,
  fields,
  brand,
  step,
  onStep,
  onPhoto,
  compact = false,
}: SurfaceProps) {
  const definition = funnelDefinition(kind);
  const [videoStarted, setVideoStarted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const videoUrl = safeDestination(fields.videoUrl) ? fields.videoUrl : "";
  const embed = webinarEmbed(videoUrl);
  const next = definition.steps[1]?.id ?? "book";
  const displayName = brand.name || "Your mortgage guide";
  const Header = compact ? "h3" : "h2";
  const benefits = [
    [fields.benefitOneTitle, fields.benefitOneText],
    [fields.benefitTwoTitle, fields.benefitTwoText],
    [fields.benefitThreeTitle, fields.benefitThreeText],
  ];
  const questions = [
    [fields.faqOneQuestion, fields.faqOneAnswer],
    [fields.faqTwoQuestion, fields.faqTwoAnswer],
    [fields.faqThreeQuestion, fields.faqThreeAnswer],
  ];
  const action = (label = fields.cta, destination = next) => (
    <Button
      variant="secondary"
      type="button"
      className={styles.cta}
      onClick={() => (step === "landing" ? setFormOpen(true) : onStep(destination))}
    >
      {label}
      <Icon decorative name="arrow-right" size="sm" />
    </Button>
  );
  const calendar = googleCalendarLink(fields);
  function downloadCalendar() {
    const content = previewCalendar(fields);
    if (!content) return;
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "webinar-preview.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
            {brand.company || "Your company"}
          </span>
          <span className={styles.brandAside}>{definition.category}</span>
        </header>
        {step === "landing" ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroWords}>
                <p className={styles.eyebrow}>
                  <span />
                  {fields.eyebrow}
                </p>
                <Header tabIndex={-1} className={styles.headline}>
                  {fields.headline}
                </Header>
                <p className={styles.description}>{fields.description}</p>
                <div className={styles.heroAction}>
                  {action()}
                  <span className={styles.actionNote}>Clear information. A human next step.</span>
                </div>
                {kind === "live-webinar" ? (
                  <div className={styles.eventLine}>
                    <span>
                      <Icon decorative name="calendar" />
                      {eventLabel(fields)}
                    </span>
                    <span>
                      <Icon decorative name="clock" />
                      {fields.eventDurationMinutes} minutes · Online
                    </span>
                  </div>
                ) : (
                  <div className={styles.hostLine}>
                    <span className={styles.avatar}>
                      {displayName
                        .split(/\s+/u)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </span>
                    <span>
                      With <strong>{displayName}</strong>
                      <small>{brand.company || "Personal mortgage guidance"}</small>
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.heroVisual}>
                <Photo
                  fields={fields}
                  slot="heroPhoto"
                  kind={kind}
                  {...(onPhoto ? { onPhoto } : {})}
                />
                <div className={styles.visualTag}>
                  <Icon
                    decorative
                    name={
                      kind === "on-demand"
                        ? "monitor"
                        : kind === "lead-magnet"
                          ? "file-text"
                          : "sparkles"
                    }
                    size="sm"
                  />
                  <span>
                    {kind === "live-webinar"
                      ? "Real questions. Live answers."
                      : kind === "on-demand"
                        ? "Watch. Reflect. Take your next step."
                        : kind === "lead-magnet"
                          ? "A guide worth keeping."
                          : "A plan built around you."}
                  </span>
                </div>
              </div>
            </section>
            <div className={styles.ribbon}>
              <span>01 &nbsp; Get clarity</span>
              <i />
              <span>02 &nbsp; Explore your options</span>
              <i />
              <span>03 &nbsp; Choose your next step</span>
            </div>
            <section className={styles.benefits}>
              <div className={styles.sectionHead}>
                <p className={styles.eyebrow}>THE VALUE IS IN THE DETAILS</p>
                <h3>{fields.sectionTitle}</h3>
              </div>
              <div className={styles.benefitGrid}>
                {benefits.map(([title, body], index) => (
                  <div className={styles.benefit} key={index}>
                    <span className={styles.number}>0{index + 1}</span>
                    <h4>{title}</h4>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.hostSection}>
              <Photo
                fields={fields}
                slot="hostPhoto"
                kind={kind}
                {...(onPhoto ? { onPhoto } : {})}
              />
              <div>
                <p className={styles.eyebrow}>MEET YOUR GUIDE</p>
                <h3>{displayName}</h3>
                <span className={styles.hostCompany}>{brand.company || COPY.hostHeading}</span>
                <p>{fields.hostBio}</p>
                {action()}
              </div>
            </section>
            <section className={styles.faq}>
              <div className={styles.sectionHead}>
                <p className={styles.eyebrow}>BEFORE YOU BEGIN</p>
                <h3>{COPY.faqHeading}</h3>
              </div>
              <div className={styles.faqItems}>
                {questions.map(([question, answer], index) => (
                  <details key={index}>
                    <summary>
                      {question}
                      <Icon decorative name="plus" size="sm" />
                    </summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
            <section className={styles.finalCta}>
              <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p>
              <h3>{fields.finalTitle}</h3>
              <p>{fields.finalText}</p>
              {action()}
            </section>
          </>
        ) : (
          <section className={styles.followPage}>
            <div className={styles.followHead}>
              <span className={styles.successMark}>
                <Icon
                  decorative
                  name={
                    step === "watch" ? "monitor" : step === "book" ? "calendar" : "circle-check"
                  }
                  size="lg"
                />
              </span>
              <p className={styles.eyebrow}>{fields.offerTitle}</p>
              <Header tabIndex={-1} className={styles.headline}>
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
              <div className={styles.eventCard}>
                <div>
                  <Icon decorative name="calendar" size="lg" />
                  <h3>{fields.offerTitle}</h3>
                  <p>{eventLabel(fields)}</p>
                  <p>{fields.eventDurationMinutes} minutes · Online</p>
                </div>
                <div className={styles.calendarActions}>
                  {calendar ? (
                    <>
                      <Link external className={styles.cta} href={calendar}>
                        {COPY.googleCalendar}
                      </Link>
                      <Button
                        variant="secondary"
                        className={styles.outline}
                        type="button"
                        onClick={downloadCalendar}
                      >
                        {COPY.calendarDownload}
                        <Icon decorative name="download" size="sm" />
                      </Button>
                    </>
                  ) : (
                    <p>{COPY.calendarMissing}</p>
                  )}
                </div>
              </div>
            ) : null}
            {step === "watch" ? (
              <>
                <div className={styles.video}>
                  {videoStarted && embed ? (
                    <iframe
                      title={fields.offerTitle}
                      src={embed}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                  ) : videoStarted && /\.(?:mp4|webm)(?:\?|$)/iu.test(videoUrl) ? (
                    <video controls autoPlay src={videoUrl} aria-label={fields.offerTitle} />
                  ) : (
                    <>
                      <Photo fields={fields} slot="heroPhoto" kind={kind} />
                      <div className={styles.videoOverlay}>
                        <span className={styles.playMark}>▶</span>
                        <h3>{fields.offerTitle}</h3>
                        {videoUrl ? (
                          embed || /\.(?:mp4|webm)(?:\?|$)/iu.test(videoUrl) ? (
                            <Button
                              variant="secondary"
                              type="button"
                              className={styles.cta}
                              onClick={() => setVideoStarted(true)}
                            >
                              {COPY.watch}
                            </Button>
                          ) : (
                            <Destination url={videoUrl}>{COPY.watch}</Destination>
                          )
                        ) : (
                          <p>{COPY.contentRequired}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.nextCall}>
                  <h3>{fields.bookingTitle}</h3>
                  <p>{fields.bookingText}</p>
                  {action(COPY.bookNext, "book")}
                </div>
              </>
            ) : null}
            {step === "book" ? (
              <div className={styles.bookingGrid}>
                {kind === "lead-magnet" ? (
                  <div className={styles.resourceCard}>
                    <Photo fields={fields} slot="heroPhoto" kind={kind} />
                    <Destination url={fields.resourceUrl}>{COPY.download}</Destination>
                  </div>
                ) : (
                  <div className={styles.bookingPerson}>
                    <Photo fields={fields} slot="hostPhoto" kind={kind} />
                    <h3>{displayName}</h3>
                    <p>{brand.company}</p>
                  </div>
                )}
                <div className={styles.bookingCard}>
                  <p className={styles.eyebrow}>A CONVERSATION ABOUT YOU</p>
                  <ul>
                    <li>
                      <Icon decorative name="check" size="sm" />
                      Bring your questions
                    </li>
                    <li>
                      <Icon decorative name="check" size="sm" />
                      Talk through your goals
                    </li>
                    <li>
                      <Icon decorative name="check" size="sm" />
                      Leave with a clearer next step
                    </li>
                  </ul>
                  <Destination url={fields.bookingUrl}>{COPY.booking}</Destination>
                  {definition.steps.some((item) => item.id === "thanks") ? (
                    <Button
                      variant="secondary"
                      type="button"
                      className={styles.textAction}
                      onClick={() => onStep("thanks")}
                    >
                      {COPY.continue}
                      <Icon decorative name="arrow-right" size="sm" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {step === "thanks" ? (
              <div className={styles.thanksCard}>
                <h3>{displayName}</h3>
                <p>{brand.company}</p>
                <p>
                  Keep any appointment details supplied by your scheduling service. Visiting this
                  preview does not confirm an appointment.
                </p>
                {kind === "lead-magnet" ? (
                  <Destination url={fields.resourceUrl}>{COPY.download}</Destination>
                ) : (
                  <Destination url={fields.bookingUrl}>{COPY.booking}</Destination>
                )}
              </div>
            ) : null}
          </section>
        )}
        <footer className={styles.footer}>
          <div>
            <strong>{brand.company || "Your company"}</strong>
            <span>
              {brand.name}
              {brand.nmls ? ` · NMLS ${brand.nmls}` : ""}
              {brand.companyNmls ? ` · Company NMLS ${brand.companyNmls}` : ""}
            </span>
          </div>
          <p>
            {brand.disclosure ||
              "Add your saved company disclosures before public use. This preview is not a commitment to lend."}
          </p>
          <p className={styles.previewFooter}>{COPY.visitorPreview}</p>
        </footer>
      </article>
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={fields.offerTitle}
        description="Contact form preview. Personal details are disabled here; no lead or registration is created."
        footer={
          <Button
            type="button"
            onClick={() => {
              setFormOpen(false);
              onStep(next);
            }}
          >
            Continue preview
            <Icon decorative name="arrow-right" size="sm" />
          </Button>
        }
      >
        <div className={styles.formPreview}>
          <TextField label="First name" value="" placeholder="Your first name" disabled />
          <TextField label="Email address" value="" placeholder="you@example.com" disabled />
          <TextField
            label="Phone number (optional)"
            value=""
            placeholder="Your phone number"
            disabled
          />
          <p>
            The live consent wording and lead delivery must be reviewed before publication. This
            screen only previews the form design.
          </p>
        </div>
      </Dialog>
    </>
  );
}
