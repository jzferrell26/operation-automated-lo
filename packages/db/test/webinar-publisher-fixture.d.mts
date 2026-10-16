export function publisherFixture(): {
  principal: import("@oalo/application").AuthenticatedPrincipal;
  summary: import("@oalo/contracts").WebinarPublisherSummary;
  launch: import("@oalo/contracts").WebinarPublisherLaunchRecord;
  resolved: import("@oalo/application").WebinarPublisherResolvedSelection;
  operation: import("@oalo/contracts").WebinarPublisherOperation;
  task: import("@oalo/contracts").WebinarPublisherTask;
  proof: import("@oalo/contracts").WebinarPublisherQualification;
  receipt: import("../src/webinar-publisher-repository.js").WebinarPublisherAdmission;
};
export function publisherEvidenceFixture(
  f: ReturnType<typeof publisherFixture>,
): Promise<import("@oalo/application").WebinarPublisherCampaignEvidence>;
