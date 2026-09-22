"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation.js";
import { Button, Card, Icon, Link, LiveRegion, Select, TextArea, TextField } from "@oalo/ui";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import { leadStages, type PreviewState } from "./model.js";
import { setupCanFinish, setupStepIds, setupTasks, type SetupStepId } from "./setup-model.js";
import { personName, ProfileAvatar } from "./product-components.js";
import styles from "./setup.module.css";

export function SetupWelcome() {
  const { state, ready, save } = useRequiredDashboardPreview();
  const router = useRouter();
  if (!ready || state.setup.welcomeSeen) return null;
  return (
    <Card className={styles.welcome} padding="none" aria-labelledby="product-welcome-title">
      <span className={styles.welcomeIcon}>
        <Icon name="sparkles" decorative />
      </span>
      <div>
        <h2 id="product-welcome-title">Welcome to AutomatedLO.</h2>
        <p>
          Set up your brand, add a partner, and build your first campaign. We'll guide you through
          it.
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          onClick={() => {
            if (
              save((current) => ({
                ...current,
                setup: { ...current.setup, welcomeSeen: true, status: "in_progress" },
              }))
            )
              router.push("/onboarding");
          }}
        >
          Set up my workspace <Icon name="arrow-right" decorative size="sm" />
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            save((current) => ({
              ...current,
              setup: { ...current.setup, welcomeSeen: true, status: "paused" },
            }))
          }
        >
          Explore first
        </Button>
      </div>
    </Card>
  );
}

export function SetupWizard() {
  const { state, ready, save, error } = useRequiredDashboardPreview();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<SetupStepId | undefined>(undefined);
  const [draft, setDraft] = useState({ ...state.profile, name: personName(state.profile.name) });
  const [partnerId, setPartnerId] = useState(state.setup.partnerId ?? "");
  const [newPartner, setNewPartner] = useState({ name: "", company: "", email: "" });
  const [stage, setStage] = useState<string>(state.routing.stage);
  const [owner, setOwner] = useState<string>(state.routing.owner);
  const [localError, setLocalError] = useState("");
  const step = state.setup.step;
  const index = setupStepIds.indexOf(step);
  const tasks = setupTasks(state);
  const completed = tasks.filter((item) => item.complete).length;
  const campaign = state.campaigns.find((item) => item.campaignRef === state.setup.campaignRef);
  const selectedPartner = state.partners.find((item) => item.id === state.setup.partnerId);
  useEffect(() => {
    if (state.setup.partnerId !== null) setPartnerId(state.setup.partnerId);
  }, [state.setup.partnerId]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (previousStep.current !== undefined && previousStep.current !== step) {
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    previousStep.current = step;
    setLocalError("");
  }, [step]);
  function change<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setLocalError("");
  }
  function go(next: SetupStepId) {
    save((current) => ({
      ...current,
      setup: { ...current.setup, step: next, status: "in_progress", welcomeSeen: true },
    }));
  }
  function persist(
    changeState: (current: PreviewState) => PreviewState,
    next = setupStepIds[Math.min(index + 1, 6)] ?? "review",
  ) {
    if (
      !save((current) => {
        const changed = changeState(current);
        return {
          ...changed,
          setup: { ...changed.setup, step: next, status: "in_progress", welcomeSeen: true },
        };
      })
    )
      setLocalError("Your changes could not be saved. Check this browser's storage and try again.");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");
    if (step === "profile")
      persist((current) => ({
        ...current,
        profile: {
          ...current.profile,
          name: draft.name.trim(),
          company: draft.company.trim(),
          email: draft.email.trim(),
          region: draft.region.trim(),
        },
        setup: { ...current.setup, profileSaved: true },
      }));
    if (step === "brand")
      persist((current) => ({
        ...current,
        profile: { ...current.profile, tagline: draft.tagline.trim() },
        setup: { ...current.setup, brandSaved: true },
      }));
    if (step === "partner") {
      if (partnerId === "new") {
        const id = `preview-partner-${crypto.randomUUID()}`;
        const partner = {
          id,
          name: newPartner.name.trim(),
          company: newPartner.company.trim(),
          email: newPartner.email.trim(),
        };
        persist((current) => ({
          ...current,
          partners: [...current.partners, partner],
          setup: { ...current.setup, partnerId: id, partnerSkipped: false },
        }));
        // Only persisted state controls which partner is used in a campaign.
      } else if (state.partners.some((item) => item.id === partnerId)) {
        persist((current) => ({
          ...current,
          setup: { ...current.setup, partnerId, partnerSkipped: false },
        }));
      } else setLocalError("Choose a partner or add one to continue.");
    }
    if (step === "routing") {
      const nextStage = leadStages.find((item) => item === stage);
      if (nextStage && (owner === "Preview owner" || owner === "Unassigned"))
        persist((current) => ({
          ...current,
          routing: { stage: nextStage, owner },
          setup: { ...current.setup, routingSaved: true },
        }));
    }
  }
  const captions: Record<SetupStepId, { title: string; description: string }> = {
    profile: {
      title: "Start with your business.",
      description: "These details personalize your workspace and the campaigns you create.",
    },
    brand: {
      title: "Make it sound like you.",
      description:
        "Give your business a clear, familiar voice. You can refine it in Brand kit anytime.",
    },
    partner: {
      title: "Bring your Realtor partner along.",
      description: "Choose who you're collaborating with. No invitation or email will be sent.",
    },
    routing: {
      title: "Give every lead a next step.",
      description: "Set the starting stage and the person responsible for follow-up.",
    },
    connections: {
      title: "Know what connects your business.",
      description: "Review the accounts you'll need before a live campaign can launch.",
    },
    campaign: {
      title: "Build your first campaign.",
      description:
        "Start with an example property or your own demo details. We'll check the content when you save.",
    },
    review: {
      title: "One final look, then you're set.",
      description: "Review your saved campaign and record a demo approval to finish this journey.",
    },
  };
  if (!ready) return <p role="status">Loading your setup…</p>;
  if (state.setup.status === "completed" && setupCanFinish(state))
    return (
      <div className={styles.complete}>
        <span className={styles.completeIcon}>
          <Icon name="check" decorative size="lg" />
        </span>
        <span className={styles.eyebrow}>Your next chapter starts here</span>
        <h1>Your demo workspace is set up.</h1>
        <p>
          Your company details, brand, routing, and first approved campaign are saved. Keep
          exploring, and reopen Help & setup whenever you need a hand.
        </p>
        <div className={styles.summary}>
          {tasks.map((task) => (
            <div key={task.id}>
              <Icon name="check" decorative size="sm" />
              <span>{task.label}</span>
              <strong>
                {task.id === "connections"
                  ? "Reviewed"
                  : task.id === "partner" && state.setup.partnerSkipped
                    ? "Add later"
                    : "Done"}
              </strong>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          Live launch still needs account connections, verified company details, and billing. This
          demo has not connected or charged anything.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => router.push("/overview")}>Go to my dashboard</Button>
          <Button variant="outline" onClick={() => go("profile")}>
            Review my setup
          </Button>
        </div>
      </div>
    );
  return (
    <div className={styles.setup}>
      <header className={styles.setupHeader}>
        <div>
          <span className={styles.eyebrow}>Getting started</span>
          <h1>Let's make this yours.</h1>
          <p>Your business. Your brand. Your first campaign.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (
              save((current) => ({
                ...current,
                setup: {
                  ...current.setup,
                  status: "paused",
                  welcomeSeen: true,
                  guide: current.setup.guide ? { ...current.setup.guide, paused: true } : null,
                },
              }))
            )
              router.push("/overview");
          }}
        >
          Pause setup
        </Button>
      </header>
      <div className={styles.setupLayout}>
        <aside className={styles.stepRail} aria-label="Setup progress">
          <span>{completed} of 7 steps complete</span>
          <progress aria-label="Workspace setup progress" value={completed} max={7} />
          <ol>
            {tasks.map((task, position) => (
              <li key={task.id}>
                <Button
                  variant="ghost"
                  aria-current={step === task.id ? "step" : undefined}
                  onClick={() => go(task.id)}
                >
                  <span className={styles.stepCircle} data-complete={task.complete || undefined}>
                    {task.complete ? <Icon name="check" decorative size="sm" /> : position + 1}
                  </span>
                  <span>
                    <strong>{task.label}</strong>
                    <small>
                      {task.id === "connections" && task.complete
                        ? "Requirements reviewed"
                        : task.id === "partner" && state.setup.partnerSkipped
                          ? "Add later"
                          : task.complete
                            ? "Saved"
                            : task.detail}
                    </small>
                  </span>
                </Button>
              </li>
            ))}
          </ol>
          <p>Pick up where you leave off. Saved steps stay on this device.</p>
        </aside>
        <Card className={styles.stepCard} padding="none">
          <header>
            <span className={styles.eyebrow}>Step {index + 1} of 7</span>
            <h2 ref={heading} tabIndex={-1}>
              {captions[step].title}
            </h2>
            <p>{captions[step].description}</p>
          </header>
          {localError || error ? (
            <LiveRegion urgency="alert" visible message={localError || error} />
          ) : null}
          {["profile", "brand", "partner", "routing"].includes(step) ? (
            <form className={styles.stepForm} onSubmit={submit}>
              {step === "profile" ? (
                <>
                  <div className={styles.two}>
                    <TextField
                      label="Your name"
                      value={draft.name}
                      onChange={(event) => change("name", event.target.value)}
                      minLength={2}
                      maxLength={120}
                      requirement="required"
                    />
                    <TextField
                      label="Company name"
                      value={draft.company}
                      onChange={(event) => change("company", event.target.value)}
                      minLength={2}
                      maxLength={160}
                      requirement="required"
                    />
                    <TextField
                      label="Email address"
                      type="email"
                      value={draft.email}
                      onChange={(event) => change("email", event.target.value)}
                      maxLength={200}
                      requirement="required"
                    />
                    <TextField
                      label="Market area"
                      value={draft.region}
                      onChange={(event) => change("region", event.target.value)}
                      minLength={2}
                      maxLength={120}
                      requirement="required"
                    />
                  </div>
                  <p className={styles.note}>
                    Use fictional details while you're exploring this demo.
                  </p>
                </>
              ) : null}
              {step === "brand" ? (
                <>
                  <TextArea
                    label="Brand tagline"
                    description="A short line you'd be happy to see alongside your name."
                    value={draft.tagline}
                    onChange={(event) => change("tagline", event.target.value)}
                    minLength={2}
                    maxLength={300}
                    requirement="required"
                  />
                  <div className={styles.brandCard}>
                    <span className={styles.eyebrow}>Your brand preview</span>
                    <h3>{state.profile.company}</h3>
                    <p>{draft.tagline}</p>
                    <div>
                      <ProfileAvatar name={personName(state.profile.name)} />
                      <span>
                        {personName(state.profile.name)}
                        <small>{state.profile.region}</small>
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              {step === "partner" ? (
                <>
                  <Select
                    label="Realtor partner"
                    value={partnerId}
                    placeholder="Choose a Realtor partner"
                    onValueChange={setPartnerId}
                    options={[
                      ...state.partners.map((partner) => ({
                        value: partner.id,
                        label: partner.name,
                        description: partner.company,
                      })),
                      {
                        value: "new",
                        label: "Add a new partner",
                        description: "Create a profile for your next collaboration",
                      },
                    ]}
                  />
                  {partnerId === "new" ? (
                    <div className={styles.partnerForm}>
                      <TextField
                        label="Partner name"
                        value={newPartner.name}
                        onChange={(event) =>
                          setNewPartner((current) => ({ ...current, name: event.target.value }))
                        }
                        minLength={2}
                        maxLength={120}
                        requirement="required"
                      />
                      <TextField
                        label="Brokerage"
                        value={newPartner.company}
                        onChange={(event) =>
                          setNewPartner((current) => ({ ...current, company: event.target.value }))
                        }
                        minLength={2}
                        maxLength={160}
                        requirement="required"
                      />
                      <TextField
                        label="Partner email"
                        type="email"
                        value={newPartner.email}
                        onChange={(event) =>
                          setNewPartner((current) => ({ ...current, email: event.target.value }))
                        }
                        maxLength={200}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
              {step === "routing" ? (
                <>
                  <Select
                    label="Starting stage"
                    value={stage}
                    options={leadStages}
                    onValueChange={setStage}
                  />
                  <Select
                    label="Assigned owner"
                    value={owner}
                    options={[
                      {
                        value: "Preview owner",
                        label: personName(state.profile.name),
                        description: "Workspace owner",
                      },
                      {
                        value: "Unassigned",
                        label: "Unassigned",
                        description: "Assign an owner later",
                      },
                    ]}
                    onValueChange={setOwner}
                  />
                  <p className={styles.note}>
                    Saved as demo preferences. Your live pipeline will be selected from HighLevel
                    after connection.
                  </p>
                </>
              ) : null}
              <footer className={styles.stepFooter}>
                <Button
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => go(setupStepIds[index - 1] ?? "profile")}
                >
                  Back
                </Button>
                {step === "partner" ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      persist((current) => ({
                        ...current,
                        setup: { ...current.setup, partnerSkipped: true, partnerId: null },
                      }))
                    }
                  >
                    Add partner later
                  </Button>
                ) : null}
                <Button type="submit">
                  Save & continue <Icon name="arrow-right" decorative size="sm" />
                </Button>
              </footer>
            </form>
          ) : null}
          {step === "connections" ? (
            <div className={styles.stepForm}>
              <div className={styles.connectionRows}>
                {[
                  ["HighLevel", "Contacts, pipeline, and follow-up"],
                  ["Meta through HighLevel", "Facebook page and ad account"],
                  [
                    "Billing & company verification",
                    "Plan, payment details, and required disclosures",
                  ],
                ].map(([name, detail]) => (
                  <div key={name}>
                    <Icon name="globe" decorative />
                    <span>
                      <strong>{name}</strong>
                      <small>{detail}</small>
                    </span>
                    <span className={styles.pending}>Live setup needed</span>
                  </div>
                ))}
              </div>
              <p className={styles.note}>
                You can complete the demo journey now. Connections are reviewed here, not activated.
                No passwords, payment details, or account permissions are requested.
              </p>
              <footer className={styles.stepFooter}>
                <Button variant="ghost" onClick={() => go("routing")}>
                  Back
                </Button>
                <Button
                  onClick={() =>
                    persist((current) => ({
                      ...current,
                      setup: { ...current.setup, connectionsReviewed: true },
                    }))
                  }
                >
                  Continue with demo
                </Button>
              </footer>
            </div>
          ) : null}
          {step === "campaign" ? (
            <div className={styles.stepForm}>
              <div className={styles.launchCard}>
                <Icon name="home" decorative size="lg" />
                <h3>One property. A complete story.</h3>
                <p>
                  Your saved profile and selected partner are ready to use in the campaign builder.
                </p>
                <Button
                  onClick={() => {
                    if (
                      save((current) => ({
                        ...current,
                        setup: {
                          ...current.setup,
                          status: "in_progress",
                          welcomeSeen: true,
                          guide: { id: "campaign", index: 0, paused: false },
                        },
                      }))
                    )
                      router.push("/marketing/campaigns/new");
                  }}
                >
                  Create my first campaign <Icon name="arrow-right" decorative size="sm" />
                </Button>
              </div>
              {state.campaigns.length > 0 ? (
                <Select
                  label="Use an existing campaign"
                  value={state.setup.campaignRef ?? ""}
                  placeholder="Choose a saved campaign"
                  options={state.campaigns.map((item) => ({
                    value: item.campaignRef,
                    label: item.headline,
                    description: item.blocking ? "Content changes needed" : "Content checks passed",
                  }))}
                  onValueChange={(value) =>
                    save((current) => ({
                      ...current,
                      setup: { ...current.setup, campaignRef: value },
                    }))
                  }
                />
              ) : null}
              {campaign ? (
                <div className={styles.savedCampaign}>
                  <Icon name={campaign.blocking ? "alert-triangle" : "check"} decorative />
                  <span>
                    <strong>{campaign.headline}</strong>
                    <small>
                      {campaign.blocking
                        ? "Resolve the content findings before continuing."
                        : "Saved and checked. Ready for your review."}
                    </small>
                  </span>
                  <Link href={campaign.detailHref}>Open campaign</Link>
                </div>
              ) : null}
              <footer className={styles.stepFooter}>
                <Button variant="ghost" onClick={() => go("connections")}>
                  Back
                </Button>
                <Button disabled={!campaign || campaign.blocking} onClick={() => go("review")}>
                  Continue to final review
                </Button>
              </footer>
            </div>
          ) : null}
          {step === "review" ? (
            <div className={styles.stepForm}>
              <div className={styles.summary}>
                <div>
                  <span>Company</span>
                  <strong>{state.profile.company}</strong>
                </div>
                <div>
                  <span>Brand voice</span>
                  <strong>{state.profile.tagline}</strong>
                </div>
                <div>
                  <span>Partner</span>
                  <strong>{selectedPartner?.name ?? "Add later"}</strong>
                </div>
                <div>
                  <span>New lead destination</span>
                  <strong>{state.routing.stage}</strong>
                </div>
                <div>
                  <span>Campaign</span>
                  <strong>{campaign?.headline ?? "Not created yet"}</strong>
                </div>
              </div>
              {campaign && campaign.state !== "approved" ? (
                <div className={styles.launchCard}>
                  <h3>
                    {campaign.blocking
                      ? "Your campaign needs a few changes."
                      : "Your campaign is ready for your decision."}
                  </h3>
                  <p>
                    Open it, review the content, and choose Approve campaign. The confirmation
                    records a demo approval only.
                  </p>
                  <Button
                    onClick={() => {
                      if (
                        save((current) => ({
                          ...current,
                          setup: {
                            ...current.setup,
                            guide: { id: "review", index: 0, paused: false },
                          },
                        }))
                      )
                        router.push(campaign.detailHref);
                    }}
                  >
                    Review my campaign
                  </Button>
                </div>
              ) : null}
              {!setupCanFinish(state) ? (
                <div className={styles.remaining}>
                  <strong>Still to finish</strong>
                  {tasks
                    .filter((task) => !task.complete)
                    .map((task) => (
                      <Button variant="ghost" key={task.id} onClick={() => go(task.id)}>
                        {task.label}
                        <Icon name="arrow-right" decorative size="sm" />
                      </Button>
                    ))}
                </div>
              ) : (
                <p className={styles.note}>
                  All seven demo setup steps are complete. Your live accounts still need connection
                  and verification before launch.
                </p>
              )}
              <footer className={styles.stepFooter}>
                <Button variant="ghost" onClick={() => go("campaign")}>
                  Back
                </Button>
                <Button
                  disabled={!setupCanFinish(state)}
                  onClick={() => {
                    if (
                      !save((current) =>
                        setupCanFinish(current)
                          ? {
                              ...current,
                              setup: {
                                ...current.setup,
                                status: "completed",
                                completedAt: new Date().toISOString(),
                                welcomeSeen: true,
                                guide: null,
                              },
                            }
                          : current,
                      )
                    )
                      setLocalError("We couldn't save your progress. Please try again.");
                  }}
                >
                  Finish setup <Icon name="check" decorative size="sm" />
                </Button>
              </footer>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
