"use client";

import { usePathname, useRouter } from "next/navigation.js";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { GUIDED_SETUP_STEPS } from "../../copy/guided-setup-messages.js";
import { postInternalJson } from "../http/internal-api.js";
import { GUIDED_SETUP_ANCHORS } from "./anchor-registry.js";
import {
  GuidedSetupContext,
  type GuidedSetupContextValue,
  type SavedCampaignReport,
} from "./guided-setup-context.js";
import { GuidedSetupStep } from "./guided-setup-step.js";
import {
  advanceTo,
  complete,
  dismiss,
  parseStoredProgress,
  resume,
  restart,
  shouldAutoStart,
  shouldShowFinishChip,
  withCampaign,
  type GuidedSetupProgress,
} from "./model/progress.js";
import { profileFromSession, type SetupProfile } from "./model/profile.js";
import { CreateCampaignStep } from "./steps/create-campaign-step.js";
import { DoneStep } from "./steps/done-step.js";
import {
  ProfileFieldsStep,
  REALTOR_PARTNER_FIELDS,
  YOUR_DETAILS_FIELDS,
  profileFieldsAreValid,
  profileFromValues,
  type ProfileFieldSpec,
} from "./steps/profile-fields-step.js";
import { ResultStep } from "./steps/result-step.js";
import { CAMPAIGN_FIELD_SEQUENCE, stepDefinition } from "./steps/step-model.js";

/**
 * PRD-006c D5. The walkthrough's one piece of state and the only thing that writes it.
 *
 * The provider is mounted by the authenticated layout, which reads progress and the profile from
 * the server before it renders. That is what 006C-AC-005 means by no client-only flash: the sheet
 * is in the server-rendered HTML because `open` is derived from the server's value on the first
 * render, not set by an effect afterwards.
 *
 * Nothing here touches `localStorage`, `sessionStorage`, or IndexedDB. Progress lives on the
 * server, per person and per workspace, so signing in on another machine resumes in the same place
 * and a shared computer never leaks one person's journey to the next.
 *
 * A failed write is deliberately not fatal. The step still moves: the walkthrough is a guide, and
 * losing a saved position is a smaller harm than a modal error in the middle of someone's first
 * five minutes. The next successful write brings the stored value back into step.
 */

export type GuidedSetupProviderProps = Readonly<{
  canApprove: boolean;
  children: ReactNode;
  /** False in a workspace with no database behind it, where there is nothing to save progress to. */
  enabled: boolean;
  initialProfile: SetupProfile | undefined;
  initialProgress: GuidedSetupProgress;
  /**
   * The instant the server rendered this page, so the seven-day chip window is decided once, on
   * one clock. Reading `Date.now()` during render would let the server and the browser disagree
   * about whether the chip exists, which is a hydration mismatch waiting for a wrong system clock.
   */
  serverNowIso: string;
  sessionDisplayName: string;
  /** The workspace name, which is the company the user typed at sign-up. */
  sessionWorkspaceName: string;
}>;

const CAMPAIGN_DETAIL_PREFIX = "/marketing/campaigns/";

/**
 * A failed save moves the step anyway and says so in the console.
 *
 * The recovery is deliberate: a walkthrough that stopped to report a failed bookkeeping write
 * would interrupt somebody's first five minutes over something that costs them, at worst, their
 * place in a seven-step guide. What it must not be is silent, because a workspace whose writes are
 * all failing would otherwise look like a walkthrough that simply never remembers anyone. The
 * message names what failed and nothing about the person.
 */
function reportSaveFailure(what: "profile" | "progress", cause: unknown): void {
  const detail = cause instanceof Error ? cause.message : String(cause);
  console.warn(`guided-setup: the ${what} write did not land (${detail}); the step moved anyway.`);
}

export function GuidedSetupProvider({
  canApprove,
  children,
  enabled,
  initialProfile,
  initialProgress,
  serverNowIso,
  sessionDisplayName,
  sessionWorkspaceName,
}: GuidedSetupProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [progress, setProgress] = useState<GuidedSetupProgress>(initialProgress);
  const [profile, setProfile] = useState<SetupProfile | undefined>(initialProfile);
  const [open, setOpen] = useState<boolean>(() => enabled && shouldAutoStart(initialProgress));
  const [campaign, setCampaign] = useState<SavedCampaignReport | undefined>(undefined);
  const [dismissPending, setDismissPending] = useState(false);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Readonly<Record<string, string>>>(() =>
    valuesFrom(
      profileFromSession(initialProfile, {
        displayName: sessionDisplayName,
        workspaceName: sessionWorkspaceName,
      }),
    ),
  );
  const requestedRoute = useRef<string | undefined>(undefined);
  /**
   * The latest progress, for the callbacks below to read without depending on it.
   *
   * Every one of them used to close over `progress`, so each stored write produced a new
   * `dismissSetup`, which the panel primitive treats as a new layer: it re-ran its open effect and
   * moved focus back to the first control in the panel, which is the close button. A user typing a
   * name then pressed space and dismissed the whole walkthrough. Stable callbacks are what stop a
   * bookkeeping write from reaching into someone's keyboard.
   */
  const progressRef = useRef(progress);
  progressRef.current = progress;
  /** F-23. One dismissal at a time, whether it came from the control or from Escape. */
  const dismissInFlight = useRef(false);
  /** F-23. Which progress write is the newest, so an older reply cannot answer for it. */
  const progressWriteToken = useRef(0);

  const persistProgress = useCallback(async (next: GuidedSetupProgress): Promise<void> => {
    /**
     * PRD-006d's named-state review, F-23. Only the newest write may reconcile.
     *
     * Two writes can be in flight at once: "Show me around again" posts step 1 and the person
     * presses Continue before that post has answered. Each reply carries the progress the server
     * held when it ran, and the replies are not ordered, so the older one used to arrive last and
     * put the walkthrough back on the step it had already left. Measured on 2026-09-20: a spec
     * pressed Continue on step 2, the profile saved and the step advanced, and the restart's own
     * reply then moved the panel back to step 2, where it stayed. Both writes answered 200, which
     * is why it read as a hang rather than an error.
     *
     * The token is compared after the await. A reply that is not the newest is still a successful
     * write; it simply has nothing left to say about where the person is now.
     */
    const token = progressWriteToken.current + 1;
    progressWriteToken.current = token;
    setProgress(next);
    try {
      const response = await postInternalJson("/api/setup/progress", { progress: next });
      if (!response.ok) {
        reportSaveFailure("progress", `the server answered ${String(response.status)}`);
        return;
      }
      const payload: unknown = await response.json();
      const stored = (payload as { progress?: unknown }).progress;
      if (stored === undefined) return;
      if (token !== progressWriteToken.current) return;
      const reconciled = parseStoredProgress(stored);
      // Only replace the value when the server actually disagrees. An identical object would be a
      // new identity for no reason, and identities are what the rest of the tree re-renders on.
      setProgress((current) =>
        JSON.stringify(current) === JSON.stringify(reconciled) ? current : reconciled,
      );
    } catch (error) {
      reportSaveFailure("progress", error);
    }
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      setOpen(true);
      setFieldIndex(0);
      void persistProgress(advanceTo(progressRef.current, step));
    },
    [persistProgress],
  );

  const saveProfile = useCallback(async (next: SetupProfile): Promise<void> => {
    setProfile(next);
    try {
      const response = await postInternalJson("/api/setup/profile", { profile: next });
      if (!response.ok) {
        reportSaveFailure("profile", `the server answered ${String(response.status)}`);
      }
    } catch (error) {
      reportSaveFailure("profile", error);
    }
  }, []);

  /**
   * PRD-006d's named-state review, F-23. The dismissal settles before the panel closes.
   *
   * "Not now" used to close the panel and post the new position afterwards. A navigation that
   * overtook that post read the old position, reopened the walkthrough on the step it was on, and
   * carried the page away from wherever the person was going. Wave 7e worked around it in the test
   * layer by waiting for the response; the race is the product's, so it is closed here: the write
   * is awaited, the panel stays open while it travels, and "Not now" is disabled meanwhile so the
   * dismissal cannot be posted twice.
   *
   * A failed write still closes the panel. `persistProgress` never rejects: it reports and returns,
   * because a walkthrough that refused to go away when somebody asked it to would be a worse
   * product than one that occasionally forgets where it was.
   */
  const dismissSetup = useCallback(() => {
    // The disabled control covers the footer's own button. Escape is the other way in, and the
    // `Sheet` does not know a dismissal is in flight, so the second press is refused here.
    if (dismissInFlight.current) return;
    dismissInFlight.current = true;
    setDismissPending(true);
    void (async () => {
      try {
        await persistProgress(dismiss(progressRef.current, new Date()));
      } finally {
        dismissInFlight.current = false;
        setDismissPending(false);
        setOpen(false);
      }
    })();
  }, [persistProgress]);

  const resumeSetup = useCallback(() => {
    setOpen(true);
    void persistProgress(resume(progressRef.current));
  }, [persistProgress]);

  const restartSetup = useCallback(() => {
    setOpen(true);
    setFieldIndex(0);
    setCampaign(undefined);
    void persistProgress(restart(progressRef.current));
  }, [persistProgress]);

  const completeSetup = useCallback(() => {
    setOpen(false);
    void persistProgress(complete(progressRef.current, new Date()));
  }, [persistProgress]);

  const reportCampaignSaved = useCallback(
    (report: SavedCampaignReport) => {
      setCampaign(report);
      setOpen(true);
      void persistProgress(advanceTo(withCampaign(progressRef.current, report.campaignRef), 5));
    },
    [persistProgress],
  );

  /**
   * On a resume in a new browser context the saved campaign reference is all that survives, so the
   * detail address is rebuilt from it. The findings are not: they belong to the page, which is
   * where the user is about to read them.
   */
  const campaignHref =
    campaign?.detailHref ??
    (progress.campaignRef === undefined
      ? undefined
      : `${CAMPAIGN_DETAIL_PREFIX}${progress.campaignRef}`);

  /**
   * D5's auto-start navigation. The sheet opens at `currentStep`; if that step's work is on
   * another page, the user is taken there first. The ref stops a repeated push while the route is
   * still settling, which would otherwise fight the user's own navigation.
   */
  useEffect(() => {
    if (!enabled || !open) return;
    const definition = stepDefinition(progress.currentStep);
    const target = definition.route === "campaign" ? campaignHref : (definition.route ?? undefined);
    if (target === undefined || pathname === target || requestedRoute.current === target) return;
    requestedRoute.current = target;
    router.push(target);
  }, [campaignHref, enabled, open, pathname, progress.currentStep, router]);

  useEffect(() => {
    if (pathname === requestedRoute.current) requestedRoute.current = undefined;
  }, [pathname]);

  const showFinishChip = enabled && shouldShowFinishChip(progress, new Date(serverNowIso));

  const value = useMemo<GuidedSetupContextValue>(
    () => ({
      canApprove,
      completeSetup,
      dismissPending,
      dismissSetup,
      enabled,
      goToStep,
      open,
      profile,
      progress,
      reportCampaignSaved,
      restartSetup,
      resumeSetup,
      saveProfile,
      showFinishChip,
    }),
    [
      canApprove,
      completeSetup,
      dismissPending,
      dismissSetup,
      enabled,
      goToStep,
      open,
      profile,
      progress,
      reportCampaignSaved,
      restartSetup,
      resumeSetup,
      saveProfile,
      showFinishChip,
    ],
  );

  return (
    <GuidedSetupContext.Provider value={value}>
      {/*
        D6's tab order: the panel's controls, then the page in document order. Tab follows the
        document, so the panel is rendered before the page rather than after it. Its position on
        screen is unaffected, because the layer is fixed and placed from measurements; what changes
        is that somebody using a keyboard reaches the step they were just shown before they reach
        the rest of the workspace.
      */}
      {enabled && open ? (
        <CurrentStep
          campaign={campaign}
          canApprove={canApprove}
          dismissPending={dismissPending}
          fieldIndex={fieldIndex}
          onComplete={completeSetup}
          onDismiss={dismissSetup}
          onFieldIndexChange={setFieldIndex}
          onSaveProfile={saveProfile}
          onStep={goToStep}
          progress={progress}
          setValues={setValues}
          values={values}
        />
      ) : null}
      {children}
    </GuidedSetupContext.Provider>
  );
}

function valuesFrom(profile: SetupProfile): Readonly<Record<string, string>> {
  return {
    displayName: profile.displayName,
    company: profile.company,
    nmlsNumber: profile.nmlsNumber ?? "",
    phone: profile.phone ?? "",
    realtorName: profile.realtorName ?? "",
    realtorBrokerage: profile.realtorBrokerage ?? "",
  };
}

type CurrentStepProps = Readonly<{
  campaign: SavedCampaignReport | undefined;
  canApprove: boolean;
  dismissPending: boolean;
  fieldIndex: number;
  onComplete: () => void;
  onDismiss: () => void;
  onFieldIndexChange: (index: number) => void;
  onSaveProfile: (profile: SetupProfile) => Promise<void>;
  onStep: (step: number) => void;
  progress: GuidedSetupProgress;
  setValues: (values: Readonly<Record<string, string>>) => void;
  values: Readonly<Record<string, string>>;
}>;

/**
 * One switch over the seven steps. It is one component rather than seven wrappers because every
 * step renders the same panel with different content, and seven wrappers would be seven places to
 * forget a prop the panel needs.
 */
function CurrentStep(props: CurrentStepProps) {
  const { campaign, canApprove, dismissPending, onComplete, onDismiss, onStep, progress } = props;
  const definition = stepDefinition(progress.currentStep);
  const shared = {
    anchor: definition.anchor,
    dismissPending,
    onDismiss,
    position: definition.position,
    progress,
    title: definition.title,
  } as const;
  const findings = campaign?.findings ?? [];

  switch (progress.currentStep) {
    case 1:
      return (
        <GuidedSetupStep
          {...shared}
          body={GUIDED_SETUP_STEPS.welcome.body}
          continueLabel={GUIDED_SETUP_STEPS.welcome.primaryLabel}
          onContinue={() => {
            onStep(2);
          }}
        />
      );
    case 2:
      return renderProfileStep(props, {
        anchor: GUIDED_SETUP_ANCHORS.setupDetailsForm,
        body: GUIDED_SETUP_STEPS.yourDetails.body,
        fields: YOUR_DETAILS_FIELDS,
        nextStep: 3,
      });
    case 3:
      return renderProfileStep(props, {
        anchor: GUIDED_SETUP_ANCHORS.setupRealtorForm,
        body: GUIDED_SETUP_STEPS.realtorPartner.body,
        fields: REALTOR_PARTNER_FIELDS,
        nextStep: 4,
      });
    case 4:
      return (
        <GuidedSetupStep
          {...shared}
          anchor={CAMPAIGN_FIELD_SEQUENCE[props.fieldIndex] ?? definition.anchor}
          body={GUIDED_SETUP_STEPS.createCampaign.body}
          onContinue={() => {
            // The last entry is the submit control, so Continue stops moving and simply hands
            // focus to it. Step 4 finishes when the checks run, not when the panel says so.
            props.onFieldIndexChange(
              Math.min(props.fieldIndex + 1, CAMPAIGN_FIELD_SEQUENCE.length - 1),
            );
          }}
        >
          <CreateCampaignStep currentIndex={props.fieldIndex} />
        </GuidedSetupStep>
      );
    case 5:
      return (
        <GuidedSetupStep
          {...shared}
          body={
            findings.length > 0
              ? GUIDED_SETUP_STEPS.readTheResult.needsChangesBody
              : GUIDED_SETUP_STEPS.readTheResult.readyBody
          }
          onContinue={() => {
            onStep(6);
          }}
        >
          <ResultStep findings={findings} />
        </GuidedSetupStep>
      );
    case 6:
      // D3. The two branches point at two different controls on the same page: the approve action
      // for someone who can approve, and the copy-link control for everyone else. Both live on the
      // campaign screen, so a user who dismissed the walkthrough still has them.
      return (
        <GuidedSetupStep
          {...shared}
          anchor={
            canApprove
              ? GUIDED_SETUP_ANCHORS.campaignApproveControl
              : GUIDED_SETUP_ANCHORS.campaignHandoffLink
          }
          body={
            canApprove
              ? GUIDED_SETUP_STEPS.approveOrHandOff.approveBody
              : GUIDED_SETUP_STEPS.approveOrHandOff.handOffBody
          }
          onContinue={() => {
            onStep(7);
          }}
        />
      );
    default:
      return (
        <GuidedSetupStep
          {...shared}
          body={GUIDED_SETUP_STEPS.whatHappensNext.body}
          continueLabel={GUIDED_SETUP_STEPS.whatHappensNext.primaryLabel}
          onContinue={onComplete}
        >
          <DoneStep />
        </GuidedSetupStep>
      );
  }
}

function renderProfileStep(
  props: CurrentStepProps,
  step: Readonly<{
    anchor:
      typeof GUIDED_SETUP_ANCHORS.setupDetailsForm | typeof GUIDED_SETUP_ANCHORS.setupRealtorForm;
    body: string;
    fields: readonly ProfileFieldSpec[];
    nextStep: number;
  }>,
) {
  const definition = stepDefinition(props.progress.currentStep);
  return (
    <GuidedSetupStep
      anchor={definition.anchor}
      body={step.body}
      continueDisabled={!profileFieldsAreValid(step.fields, props.values)}
      dismissPending={props.dismissPending}
      onContinue={() => {
        // The save is awaited before the step moves, because the step after this one renders on
        // the server from the profile this one just wrote. Firing both at once worked on a fast
        // machine and left the create screen's Realtor field empty on a slow one, which is the
        // kind of defect that only ever shows up in front of somebody.
        void (async () => {
          await props.onSaveProfile(profileFromValues(props.values));
          props.onStep(step.nextStep);
        })();
      }}
      onDismiss={props.onDismiss}
      position={definition.position}
      progress={props.progress}
      title={definition.title}
    >
      <ProfileFieldsStep
        anchor={step.anchor}
        fields={step.fields}
        legend={definition.title}
        onValuesChange={props.setValues}
        values={props.values}
      />
    </GuidedSetupStep>
  );
}
