"use client";

import { Badge, Button, Card, Link, LiveRegion, Stepper, TextArea, TextField } from "@oalo/ui";
import { useRef, useState } from "react";
import { AdCreative, type AdShape } from "../campaigns/components/ad-creative.js";
import type { LaunchBand } from "../campaigns/launch-model.js";
import { WEBINAR_ADS } from "./catalog.js";
import {
  WEBINAR_GOALS,
  webinarEditorHref,
  webinarReviewCopy,
  type WebinarAd,
  type WebinarFormat,
  type WebinarGoal,
} from "./model.js";
import styles from "./pack.module.css";

type Words = Readonly<{ headline: string; primaryText: string }>;
const STEP_TITLES = ["Choose a creative", "Prepare your words", "Review your draft"] as const;

/** Local preparation only. This module has no campaign save, approval or provider dependency. */
export function WebinarAdsPack({ advertiser }: Readonly<{ advertiser: LaunchBand }>) {
  const [chosen, setChosen] = useState<WebinarAd | undefined>();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<WebinarGoal | undefined>();
  const [format, setFormat] = useState<WebinarFormat>("live-webinar");
  const [shape, setShape] = useState<AdShape>("tall");
  const [drafts, setDrafts] = useState<Readonly<Record<string, Words>>>({});
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const words =
    chosen === undefined
      ? undefined
      : (drafts[chosen.id] ?? { headline: chosen.headline, primaryText: chosen.primaryText });
  const shown =
    goal === undefined ? WEBINAR_ADS : WEBINAR_ADS.filter((entry) => entry.goal === goal);
  const tooShort =
    words !== undefined &&
    (words.headline.trim().length < 3 || words.primaryText.trim().length < 3);
  function move(next: 1 | 2 | 3) {
    setStep(next);
    setNotice("");
    setAnnouncement(`Step ${String(next)} of 3: ${STEP_TITLES[next - 1] ?? "Choose a creative"}`);
    heading.current?.focus();
  }
  function update(change: Partial<Words>) {
    if (chosen === undefined || words === undefined) return;
    setDrafts((previous) => ({ ...previous, [chosen.id]: { ...words, ...change } }));
    setNotice("");
  }
  async function copy() {
    if (chosen === undefined || words === undefined) return;
    try {
      await navigator.clipboard.writeText(
        webinarReviewCopy(chosen, words.headline, words.primaryText, format),
      );
      setNotice("Draft words copied, including the pending-review notes.");
    } catch {
      setNotice("Copy was unavailable. Select the headline and ad text to copy them manually.");
    }
  }
  return (
    <section
      aria-labelledby="webinar-pack-title"
      className={styles.pack}
      data-webinar-pack="pending-review"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>First-time homebuyer education</p>
          <h2 id="webinar-pack-title" ref={heading} tabIndex={-1}>
            Fifteen webinar ad creatives
          </h2>
          <p>
            Original artwork and ready-to-edit words that match your webinar. Choose an angle,
            prepare your message and review it in your brand.
          </p>
          <Link href="/marketing/campaigns/webinar" variant="action">
            Prepare a saved webinar ad
          </Link>
        </div>
        <Badge tone="warning">Pending review</Badge>
      </header>
      <p className={styles.notice}>
        These creatives await owner and lender review. Preparing or downloading a draft does not
        approve or launch an ad.
      </p>
      <Stepper
        label="Webinar creative preparation"
        steps={STEP_TITLES.map((title, index) => ({
          id: `webinar-step-${String(index + 1)}`,
          title,
          state: index + 1 === step ? "current" : index + 1 < step ? "complete" : "upcoming",
        }))}
      />
      <LiveRegion aria-label="Webinar preparation step" message={announcement} />
      {step === 1 || chosen === undefined || words === undefined ? (
        <>
          <div aria-label="Webinar learning topics" className={styles.filters} role="group">
            <Button
              aria-pressed={goal === undefined}
              onClick={() => setGoal(undefined)}
              size="sm"
              variant="outline"
            >
              All fifteen
            </Button>
            {(Object.keys(WEBINAR_GOALS) as WebinarGoal[]).map((value) => (
              <Button
                aria-pressed={goal === value}
                key={value}
                onClick={() => setGoal(value)}
                size="sm"
                variant="outline"
              >
                {WEBINAR_GOALS[value]}
              </Button>
            ))}
          </div>
          <p className={styles.caption}>
            {shown.length} creatives to explore. Each supports a live or on-demand webinar.
          </p>
          <ul className={styles.grid}>
            {shown.map((ad) => (
              <li key={ad.id}>
                <Card className={styles.card} data-webinar-creative={ad.id} padding="none">
                  <AdCreative
                    advertiser={advertiser}
                    alt={ad.art.alt}
                    art={{ tall: ad.art.tall.path, square: ad.art.square.path }}
                    sample={false}
                    shape="tall"
                  />
                  <div className={styles.cardBody}>
                    <p className={styles.eyebrow}>{WEBINAR_GOALS[ad.goal]}</p>
                    <h3>{ad.name}</h3>
                    <p>{ad.headline}</p>
                    <Badge tone="warning">Pending review</Badge>
                    <Button
                      onClick={() => {
                        setChosen(ad);
                        move(2);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Prepare this creative<span className="oalo-visually-hidden">: {ad.name}</span>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className={styles.preparation}>
          <Card className={styles.details} padding="lg">
            <h3>{chosen.name}</h3>
            <p>{chosen.learningConnection}</p>
            <div aria-label="Webinar format" className={styles.filters} role="group">
              <Button
                aria-pressed={format === "live-webinar"}
                onClick={() => setFormat("live-webinar")}
                size="sm"
                variant="outline"
              >
                Live webinar
              </Button>
              <Button
                aria-pressed={format === "on-demand"}
                onClick={() => setFormat("on-demand")}
                size="sm"
                variant="outline"
              >
                On-demand webinar
              </Button>
            </div>
            {step === 2 ? (
              <>
                <TextField
                  label="Webinar ad headline"
                  maxLength={60}
                  description={`${words.headline.length} of 60 characters`}
                  error={
                    words.headline.trim().length < 3
                      ? "Add at least 3 visible characters to the headline."
                      : undefined
                  }
                  onChange={(event) => update({ headline: event.target.value })}
                  value={words.headline}
                />
                <TextArea
                  label="Webinar ad text"
                  maxLength={300}
                  description={`${words.primaryText.length} of 300 characters`}
                  error={
                    words.primaryText.trim().length < 3
                      ? "Add at least 3 visible characters to the ad text."
                      : undefined
                  }
                  onChange={(event) => update({ primaryText: event.target.value })}
                  rows={5}
                  value={words.primaryText}
                />
                <Button
                  onClick={() =>
                    update({ headline: chosen.headline, primaryText: chosen.primaryText })
                  }
                  variant="ghost"
                >
                  Restore original words
                </Button>
                <p className={styles.notice}>
                  Edits stay in this page until you leave or reload. Keep the words educational and
                  consistent with what your webinar teaches.
                </p>
                <div className={styles.actions}>
                  <Button onClick={() => move(1)} variant="outline">
                    Back to creatives
                  </Button>
                  <Button
                    aria-describedby={tooShort ? "webinar-draft-minimum" : undefined}
                    disabled={tooShort}
                    onClick={() => move(3)}
                  >
                    Review this draft
                  </Button>
                </div>
                {tooShort ? (
                  <p className={styles.notice} id="webinar-draft-minimum">
                    To review, add at least 3 visible characters to both the headline and ad text.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <dl className={styles.facts}>
                  <div>
                    <dt>Creative status</dt>
                    <dd>Pending owner and lender review</dd>
                  </div>
                  <div>
                    <dt>Webinar destination</dt>
                    <dd>No published webinar is bound to this draft.</dd>
                  </div>
                  <div>
                    <dt>Advertiser identity</dt>
                    <dd>Preview from your saved Brand. Downloads contain artwork only.</dd>
                  </div>
                  <div>
                    <dt>Campaign status</dt>
                    <dd>No campaign has been saved, approved or launched.</dd>
                  </div>
                </dl>
                <Link href={webinarEditorHref(format)}>
                  Open your {format === "live-webinar" ? "live" : "on-demand"} webinar
                </Link>
                <p className={styles.notice}>
                  The editor is a separate step. Opening it does not attach a destination, verify
                  registration or publish this creative.
                </p>
                <div className={styles.actions}>
                  <Button onClick={() => move(2)} variant="outline">
                    Edit draft words
                  </Button>
                  <Button
                    onClick={() => {
                      void copy();
                    }}
                  >
                    Copy draft words
                  </Button>
                </div>
                <div className={styles.downloads}>
                  <Link download={`${chosen.id}-tall-art.png`} href={chosen.art.tall.path}>
                    Download tall artwork
                  </Link>
                  <Link download={`${chosen.id}-square-art.png`} href={chosen.art.square.path}>
                    Download square artwork
                  </Link>
                </div>
                <p className={styles.notice}>
                  Artwork only: add the required advertiser identity, NMLS details and disclosures
                  before use. Downloads do not include the brand band shown in the preview.
                </p>
                <Button onClick={() => move(1)} variant="ghost">
                  Choose another creative
                </Button>
              </>
            )}
            {notice ? (
              <LiveRegion aria-label="Draft clipboard status" message={notice} visible />
            ) : null}
          </Card>
          <Card className={styles.preview} padding="lg">
            <div className={styles.previewHeading}>
              <h3>Your draft preview</h3>
              <Badge tone="warning">Pending review</Badge>
            </div>
            <p className={styles.editedText} data-webinar-preview-text="">
              {words.primaryText}
            </p>
            <div aria-label="Creative preview shape" className={styles.filters} role="group">
              <Button
                aria-pressed={shape === "tall"}
                onClick={() => setShape("tall")}
                size="sm"
                variant="outline"
              >
                Tall
              </Button>
              <Button
                aria-pressed={shape === "square"}
                onClick={() => setShape("square")}
                size="sm"
                variant="outline"
              >
                Square
              </Button>
            </div>
            <AdCreative
              advertiser={advertiser}
              alt={chosen.art.alt}
              art={{ tall: chosen.art.tall.path, square: chosen.art.square.path }}
              sample={false}
              shape={shape}
            />
            <h4 className={styles.editedHeadline} data-webinar-preview-headline="">
              {words.headline}
            </h4>
            <p className={styles.caption}>
              A creative preview in your brand, awaiting review. It does not represent a live
              Facebook ad.
            </p>
          </Card>
        </div>
      )}
    </section>
  );
}
