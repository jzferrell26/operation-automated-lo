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
import type { SetupCampaignResult } from "./model/campaign-result.js";
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
 * A failed write keeps the step where it is and says so. Until 2026-09-20 it moved the step anyway
 * and wrote a line to the console, so a person whose details had not saved was shown the next step
 * and told nothing; the following morning their name was gone and nothing had ever said why. The
 * panel now holds its place, reads PRD-006b D7's generic sentence out through its own status
 * region, and offers the same Continue as the retry.
 */

export type GuidedSetupProviderProps = Readonly<{
  canApprove: boolean;
  children: ReactNode;
  /** False in a workspace with no database behind it, where there is nothing to save progress to. */
  enabled: boolean;
  initialProfile: SetupProfile | undefined;
  initialProgress: GuidedSetupProgress;
  /**
   * PRD-006c D3 step 5. The server's reading of the campaign the stored progress names.
   *
   * It is a prop rather than something the panel fetches because the layout already reads progress
   * on the server, and the two facts belong to the same render: a step that said "ready" from one
   * render and "needs changes" from the next would be the defect this closes, in a smaller window.
   */
  savedCampaign?: SetupCampaignResult | undefined;
  /**
   * PRD-006c D5. The campaign waiting for this person's decision, when they can approve and have
   * none of their own. The walkthrough hands them to it instead of asking them to create one.
   */
  campaignAwaitingDecision?: SetupCampaignResult | undefined;
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
 * What a failed save leaves in the console, beside what it says on the screen.
 *
 * The screen gets PRD-006b D7's generic sentence, which is all a loan officer can act on. The
 * console gets the shape of the failure, because a workspace whose writes are all failing would
 * otherwise be indistinguishable from a walkthrough that simply never remembers anyone. The
 * message names what failed and nothing about the person.
 */
function reportSaveFailure(what: "profile" | "progress", cause: unknown): void {
  const detail = cause instanceof Error ? cause.message : String(cause);
  console.warn(`guided-setup: the ${what} write did not land (${detail}); the step stayed put.`);
}

export function GuidedSetupProvider({
  canApprove,
  children,
  enabled,
  campaignAwaitingDecision,
  initialProfile,
  initialProgress,
  savedCampaign,
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
  /**
   * PRD-006d D7, through 006D-AC-011. True from a failed profile or progress write until the next
   * attempt. It is what the panel reads its sentence out of, and it is cleared when a write is
   * tried again rather than when one succeeds, so the region says nothing while the retry travels.
   */
  const [writeFailed, setWriteFailed] = useState(false);
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
  /**
   * Whether the panel is on screen, for the callbacks below to read without depending on it, for
   * the same reason `progressRef` exists: a callback that changed identity on every open would be
   * a new layer to the panel primitive.
   */
  const openRef = useRef(open);
  openRef.current = open;
  /** The latest saved profile, so a failed write can put the previous one back. */
  const profileRef = useRef(profile);
  profileRef.current = profile;
  /** F-23. One dismissal at a time, whether it came from the control or from Escape. */
  const dismissInFlight = useRef(false);
  /** F-23. Which progress write is the newest, so an older reply cannot answer for it. */
  const progressWriteToken = useRef(0);
  /**
   * Wave 7m. Which opening of the panel is the newest, so a settled dismissal cannot close one it
   * never saw. Every deliberate opening bumps it; `dismissSetup` records the value it was pressed
   * against and closes only if that is still the current one.
   */
  const openGeneration = useRef(0);

  /**
   * The one way the panel is opened, so no opening is missed by the generation count above.
   */
  const openWalkthrough = useCallback(() => {
    openGeneration.current += 1;
    setOpen(true);
  }, []);

  const persistProgress = useCallback(async (next: GuidedSetupProgress): Promise<boolean> => {
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
     *
     * 006D-AC-011. A write that does not land puts the stored value back where it was and answers
     * false. The caller is what decides whether that matters: a step that was about to advance
     * stays where it is, and a dismissal closes anyway, because a walkthrough that refused to go
     * away when somebody asked it to would be worse than one that forgets where it was.
     */
    const token = progressWriteToken.current + 1;
    progressWriteToken.current = token;
    const previous = progressRef.current;
    setWriteFailed(false);
    setProgress(next);
    const failed = (cause: unknown): boolean => {
      reportSaveFailure("progress", cause);
      if (token === progressWriteToken.current) setProgress(previous);
      setWriteFailed(true);
      return false;
    };
    try {
      const response = await postInternalJson("/api/setup/progress", { progress: next });
      if (!response.ok) {
        return failed(`the server answered ${String(response.status)}`);
      }
      const payload: unknown = await response.json();
      const stored = (payload as { progress?: unknown }).progress;
      if (stored === undefined) return true;
      if (token !== progressWriteToken.current) return true;
      const reconciled = parseStoredProgress(stored);
      // Only replace the value when the server actually disagrees. An identical object would be a
      // new identity for no reason, and identities are what the rest of the tree re-renders on.
      setProgress((current) =>
        JSON.stringify(current) === JSON.stringify(reconciled) ? current : reconciled,
      );
      return true;
    } catch (error) {
      return failed(error);
    }
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      openWalkthrough();
      setFieldIndex(0);
      void persistProgress(advanceTo(progressRef.current, step));
    },
    [openWalkthrough, persistProgress],
  );

  /**
   * 006D-AC-011. Answers whether the profile landed.
   *
   * The typed values stay on screen either way: they are the person's own text and losing them
   * would be a second failure on top of the first. What a false answer buys is that the step does
   * not move, so nobody is carried past a form whose contents were never saved.
   */
  const saveProfile = useCallback(async (next: SetupProfile): Promise<boolean> => {
    const previous = profileRef.current;
    setWriteFailed(false);
    setProfile(next);
    const failed = (cause: unknown): boolean => {
      reportSaveFailure("profile", cause);
      setProfile(previous);
      setWriteFailed(true);
      return false;
    };
    try {
      const response = await postInternalJson("/api/setup/profile", { profile: next });
      if (!response.ok) {
        return failed(`the server answered ${String(response.status)}`);
      }
      return true;
    } catch (error) {
      return failed(error);
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
   *
   * Wave 7m. Waiting for the write left a second race behind it: the close now happens whenever the
   * write answers, and by then the person may have asked for the walkthrough again. "Not now",
   * then "Finish setup" or "Show me around again" while the first write is still travelling, used
   * to open the panel and then have it vanish a beat later with no way back. Measured on
   * 2026-09-20 with the dismissal's write held for 900 ms: the panel a restart had just opened was
   * removed 1260 ms in, and `guided-setup.resume.spec.ts` timed out pressing "Let's go" on it. So
   * the dismissal closes only the opening it was pressed against.
   */
  const dismissSetup = useCallback(() => {
    // The disabled control covers the footer's own button. Escape is the other way in, and the
    // `Sheet` does not know a dismissal is in flight, so the second press is refused here.
    if (dismissInFlight.current) return;
    dismissInFlight.current = true;
    const dismissedGeneration = openGeneration.current;
    setDismissPending(true);
    void (async () => {
      try {
        await persistProgress(dismiss(progressRef.current, new Date()));
      } finally {
        dismissInFlight.current = false;
        setDismissPending(false);
        if (openGeneration.current === dismissedGeneration) setOpen(false);
      }
    })();
  }, [persistProgress]);

  const resumeSetup = useCallback(() => {
    openWalkthrough();
    void persistProgress(resume(progressRef.current));
  }, [openWalkthrough, persistProgress]);

  const restartSetup = useCallback(() => {
    openWalkthrough();
    setFieldIndex(0);
    setCampaign(undefined);
    void persistProgress(restart(progressRef.current));
  }, [openWalkthrough, persistProgress]);

  const completeSetup = useCallback(() => {
    setOpen(false);
    void persistProgress(complete(progressRef.current, new Date()));
  }, [persistProgress]);

  /**
   * Step 4 finishes when the checks run, which only the create screen knows, so the screen calls
   * this and the walkthrough moves itself on to step 5.
   *
   * Wave 7m. It moves on only if the walkthrough is actually running. Opening the panel here used
   * to reopen one the person had put aside, and step 5's route is the campaign's own page, so the
   * auto-start effect below then carried them off the result they had just saved, about 200 ms
   * after it appeared. Measured on 2026-09-20 on the create screen: the "Open campaign" link was
   * added 288 ms after the save and removed 204 ms later, unthrottled, and 467 ms then 201 ms under
   * 6x CPU throttling; `review-campaign-decision.spec.ts` spent three 15-minute timeouts on the
   * runner trying to click it inside that window. The campaign is still remembered, so "Finish
   * setup" resumes onto it, but nothing opens itself and nothing navigates.
   */
  const reportCampaignSaved = useCallback(
    (report: SavedCampaignReport) => {
      setCampaign(report);
      const saved = withCampaign(progressRef.current, report.campaignRef);
      if (!openRef.current) {
        void persistProgress(saved);
        return;
      }
      void persistProgress(advanceTo(saved, 5));
    },
    [persistProgress],
  );

  /**
   * PRD-006c D3 step 5 and D5. Which campaign steps 5 and 6 are about, and what is known about it.
   *
   * The server's reading wins whenever it is about the same campaign the browser is holding, which
   * is the whole point: the in-session report is a snapshot of one save, and after a resume in a
   * new context there is no report at all. A report that names a different campaign is newer than
   * the server's, because it was created after this page was rendered, so it wins instead.
   *
   * With nothing of their own, somebody who can approve is given the campaign that is waiting for
   * a decision. That is D5's "the approver's journey at step 6 approves the creator's campaign if
   * one exists", and it is the only branch in which step 4 is not this person's work.
   */
  const ownCampaign: SetupCampaignResult | undefined =
    campaign === undefined
      ? savedCampaign
      : savedCampaign?.campaignRef === campaign.campaignRef
        ? savedCampaign
        : campaign;
  const waitingCampaign: SetupCampaignResult | undefined =
    ownCampaign === undefined && progress.campaignRef === undefined && canApprove
      ? campaignAwaitingDecision
      : undefined;
  const stepCampaign = ownCampaign ?? waitingCampaign;
  /**
   * On a resume the stored reference is all that survives when the campaign itself could not be
   * read, so the detail address is still rebuilt from it: the step says it does not know what the
   * checks found, and still takes the person to the page that does.
   */
  const campaignHref =
    stepCampaign?.detailHref ??
    (progress.campaignRef === undefined
      ? undefined
      : `${CAMPAIGN_DETAIL_PREFIX}${progress.campaignRef}`);
  /**
   * D5. Step 4 is "Create the Open House Boost", and an approver whose colleague has already
   * created one does not need to create a second. Their step 3 hands them straight to the result,
   * which marks step 4 complete, because somebody did do it: the creator.
   */
  const stepAfterTheRealtor = waitingCampaign === undefined ? 4 : 5;

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
          campaign={stepCampaign}
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
          stepAfterTheRealtor={stepAfterTheRealtor}
          values={values}
          writeFailed={writeFailed}
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
  campaign: SetupCampaignResult | undefined;
  canApprove: boolean;
  dismissPending: boolean;
  fieldIndex: number;
  onComplete: () => void;
  onDismiss: () => void;
  onFieldIndexChange: (index: number) => void;
  onSaveProfile: (profile: SetupProfile) => Promise<boolean>;
  onStep: (step: number) => void;
  progress: GuidedSetupProgress;
  setValues: (values: Readonly<Record<string, string>>) => void;
  /** D5. 4 for everybody whose own campaign this is, 5 for an approver who has one waiting. */
  stepAfterTheRealtor: number;
  values: Readonly<Record<string, string>>;
  writeFailed: boolean;
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
    writeFailed: props.writeFailed,
  } as const;

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
        nextStep: props.stepAfterTheRealtor,
      });
    case 4:
      return (
        <GuidedSetupStep
          {...shared}
          anchor={CAMPAIGN_FIELD_SEQUENCE[props.fieldIndex] ?? definition.anchor}
          body={GUIDED_SETUP_STEPS.createCampaign.body}
          // The one Continue that moves the highlight without moving the step, so the one that
          // hands focus to the field it moved on to.
          continueStaysOnThisStep
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
      // The three answers are the campaign's, not this session's. `undefined` is the honest one:
      // the campaign could not be read, so the step says neither that it is ready nor that it
      // needs changes, and points at the page that knows.
      return (
        <GuidedSetupStep
          {...shared}
          body={resultBody(campaign)}
          onContinue={() => {
            onStep(6);
          }}
        >
          <ResultStep result={campaign} />
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

function resultBody(campaign: SetupCampaignResult | undefined): string {
  if (campaign === undefined) return GUIDED_SETUP_STEPS.readTheResult.unknownBody;
  return campaign.ready
    ? GUIDED_SETUP_STEPS.readTheResult.readyBody
    : GUIDED_SETUP_STEPS.readTheResult.needsChangesBody;
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
        //
        // 006D-AC-011. A save that did not land keeps the step here, and the panel says so. The
        // same Continue is the retry, which is why nothing is disabled on the way out.
        void (async () => {
          if (await props.onSaveProfile(profileFromValues(props.values))) {
            props.onStep(step.nextStep);
          }
        })();
      }}
      onDismiss={props.onDismiss}
      position={definition.position}
      progress={props.progress}
      title={definition.title}
      writeFailed={props.writeFailed}
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
