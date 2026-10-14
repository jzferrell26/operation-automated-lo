import { describe, expect, it } from "vitest";
import {
  canonicalCampaignHash,
  createApprovalDecision,
  createSessionApprovalAuthority,
  prepareWebinarPublisherSummary,
  executeWebinarPublisherCommand,
  webinarPublisherConfirmationHash,
  type WebinarPublisherCommandPorts,
  type WebinarPublisherCommandTransaction,
  type WebinarPublisherCampaignEvidence,
  type WebinarPublisherResolvedSelection,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  WebinarPublisherLaunchRecordSchema,
  type WebinarPublisherLaunchRecord,
  type WebinarPublisherOperation,
  type WebinarPublisherTask,
  type WebinarPublisherCommand,
} from "@oalo/contracts";
import { assertWebinarPublisherProjection, WEBINAR_PUBLISHER_WIRE_MAPPING_HASH } from "@oalo/ghl";
import { WEBINAR_NOW, webinarEvidence } from "../webinar-ads/webinar-foundation-fixtures.js";

async function fixture() {
  const base = await webinarEvidence((manifest) => {
    manifest.meta.targeting.regions = ["IL"];
    manifest.meta.targeting.cities = [];
    manifest.meta.dailyBudgetMinor = 1000;
    manifest.meta.totalBudgetMinor = 50000;
    manifest.content.disclosureText = "Equal Housing Lender.";
  });
  if (base.version.manifest.blueprintId !== "webinar-ad")
    throw new Error("Wrong fixture blueprint");
  const principal: AuthenticatedPrincipal = {
    actorRef: base.version.createdBy,
    actorId: "00000000-0000-4000-8000-000000000001",
    locationRef: base.version.locationRef,
    locationId: "00000000-0000-4000-8000-000000000002",
    installationRef: "installation_commands001",
    role: "location_admin",
    roleVersion: 1,
    sessionId: "session_commands001",
    authenticationMode: "embedded",
  };
  const approval = await createApprovalDecision(
    {
      approvalRef: "approval_commands001",
      campaignVersion: base.version,
      preflight: base.preflight,
      actorRef: principal.actorRef,
      actorKind: "human",
      actorRole: "location_admin",
      decidedAt: WEBINAR_NOW,
      ipAuditHash: "a".repeat(64),
      decision: "approved",
      approverDisplayName: undefined,
    },
    createSessionApprovalAuthority(principal),
    { assertCurrent: async () => {} },
  );
  let current: WebinarPublisherCampaignEvidence = {
    version: { ...base.version, manifest: base.version.manifest },
    preflight: base.preflight,
    approval,
    state: "approved",
  };
  let resolved: WebinarPublisherResolvedSelection = {
    adAccountRef: "account_selection001",
    pageRef: "page_selection001",
    assets: {
      locationId: "native_location001",
      adAccountId: "act_123456",
      pageId: "123456",
      discoveryHash: "b".repeat(64),
      currency: "USD",
      timezone: "America/Chicago",
    },
    accountLabel: "Owned ad account",
    pageLabel: "Example Lending",
    geographies: [
      {
        key: "12345",
        name: "Illinois",
        type: "region",
        countryCode: "US",
        selectionType: "include",
        discoveryHash: "c".repeat(64),
        selectionRef: "geography_illinois001",
        approvedPlace: "IL",
      },
    ],
    providerContract: {
      evidenceRevision: 1,
      apiVersion: "v3",
      wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    },
    totalSemantics: "estimated_ceiling",
  };
  let launch: WebinarPublisherLaunchRecord | undefined;
  const operations = new Map<string, WebinarPublisherOperation>();
  const outbox: WebinarPublisherTask[] = [];
  let owner = principal;
  let time = WEBINAR_NOW;
  let withdrawn = false;
  let owned = true;
  let proofKind = "app_test";
  let active = false;
  let infrastructureFailure = false;
  let next = 0;
  let barrier: Promise<void> = Promise.resolve();
  const selection = {
    adAccountRef: "account_selection001",
    pageRef: "page_selection001",
    creativeAssetRef: base.version.manifest.images[1]!.assetRef,
    geographyRefs: ["geography_illinois001"],
  };
  const tx: WebinarPublisherCommandTransaction = {
    loadCurrentEvidence: async () => current,
    resolveSelection: async () => resolved,
    insertSummary: async (summary) => {
      launch = WebinarPublisherLaunchRecordSchema.parse({
        summary,
        rowVersion: 1,
        state: "reserved",
        nativeIds: { campaignId: null, adsetId: null, adId: null },
      });
      return launch;
    },
    loadLaunch: async () => launch,
    findCommand: async (requestId) => operations.get(requestId),
    reserveCommand: async (input) => {
      if (infrastructureFailure) throw new Error("fixture transaction rolled back");
      if (!launch || launch.rowVersion !== input.expectedRowVersion || active)
        throw new Error("fixture lineage CAS conflict");
      active = true;
      launch = { ...launch, rowVersion: launch.rowVersion + 1 };
      operations.set(input.operation.requestId, input.operation);
      outbox.push(input.task);
      return input.operation;
    },
  };
  const ports: WebinarPublisherCommandPorts = {
    repository: {
      async run(_principal, work) {
        const previous = barrier;
        let release = () => {};
        barrier = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await work(tx);
        } finally {
          release();
        }
      },
    },
    evidence: {
      assertCurrent: async () => {
        if (withdrawn) throw new Error("fixture source withdrawn");
      },
    },
    currentPrincipal: async () => owner,
    assertOwnedLineage: async () => {
      if (!owned) throw new Error("fixture foreign native lineage");
    },
    provider: {
      readiness: async () => [],
      assertCurrent: async ({ projection, action, nativeIds }) => {
        if (action === "cancel") return undefined;
        if (action === "pause")
          return {
            schemaVersion: 1,
            contractId: "CTR-003",
            contractRevision: 1,
            kind: proofKind,
            action,
            evidenceRef: "evidence_control001",
            artifactHash: "d".repeat(64),
            projectionHash: projection.projectionHash,
            wireMappingHash: projection.providerContract.wireMappingHash,
            locationId: projection.assets.locationId,
            adAccountId: projection.assets.adAccountId,
            campaignId: nativeIds.campaignId ?? "campaign_missing001",
            observedAt: time.toISOString(),
            expiresAt: new Date(time.getTime() + 60_000).toISOString(),
          };
        return {
          schemaVersion: 1,
          contractId: "CTR-003",
          contractRevision: 1,
          kind: proofKind,
          evidenceRef: "evidence_commands001",
          artifactHash: "d".repeat(64),
          projectionHash: projection.projectionHash,
          wireMappingHash: projection.providerContract.wireMappingHash,
          evidenceRevision: 1,
          locationId: projection.assets.locationId,
          adAccountId: projection.assets.adAccountId,
          pageId: projection.assets.pageId,
          currency: "USD",
          timezone: projection.assets.timezone,
          observedAt: WEBINAR_NOW.toISOString(),
          expiresAt: "2026-10-12T18:00:00.000Z",
          schedule: {
            format: "offset_datetime",
            requestEnd: projection.schedule.endsAt,
            observedStop: projection.schedule.endsAt,
            requestHash: "e".repeat(64),
            readBackHash: "f".repeat(64),
          },
          budget: {
            mode: "DAILY",
            amountMajor: projection.budget.dailyBudgetMinor / 100,
            totalSemantics: "estimated_ceiling",
            requestHash: "e".repeat(64),
            readBackHash: "f".repeat(64),
          },
        };
      },
    },
    allocateRef: (kind) => `${kind}_commands${++next}`,
    now: () => time,
  };
  const request = {
    campaignRef: base.version.campaignRef,
    campaignVersionRef: base.version.campaignVersionRef,
    expectedManifestHash: base.version.manifestHash,
    expectedPreflightHash: base.preflight.resultHash,
    selection,
  };
  function command(
    action: WebinarPublisherCommand["action"] = "draft",
    requestId = "00000000-0000-4000-8000-000000000021",
  ): WebinarPublisherCommand {
    if (!launch) throw new Error("fixture summary missing");
    return {
      requestId,
      action,
      projectionRef: launch.summary.projection.projectionRef,
      expectedProjectionHash: launch.summary.projection.projectionHash,
      expectedRowVersion: launch.rowVersion,
      confirmationHash: webinarPublisherConfirmationHash({
        action,
        summary: launch.summary,
        nativeIds: launch.nativeIds,
      }),
    };
  }
  return {
    principal,
    ports,
    request,
    command,
    operations,
    outbox,
    tx,
    get launch() {
      if (!launch) throw new Error("fixture summary missing");
      return launch;
    },
    setLaunch(value: WebinarPublisherLaunchRecord) {
      launch = value;
      active = false;
    },
    setOwner(value: AuthenticatedPrincipal) {
      owner = value;
    },
    setResolved(change: Partial<WebinarPublisherResolvedSelection>) {
      resolved = { ...resolved, ...change };
    },
    get resolved() {
      return resolved;
    },
    setEvidence(value: WebinarPublisherCampaignEvidence) {
      current = value;
    },
    get current() {
      return current;
    },
    expire() {
      time = new Date("2026-10-16T00:00:00Z");
    },
    withdraw() {
      withdrawn = true;
    },
    foreign() {
      owned = false;
    },
    synthetic() {
      proofKind = "local_synthetic";
    },
    failTransaction() {
      infrastructureFailure = true;
    },
  };
}

describe("webinar summary and exact command boundary", () => {
  it("derives the actual approved producer UUID, exact bytes, copy and canonical native projection", async () => {
    const f = await fixture();
    const manifestBefore = canonicalCampaignHash(f.current.version.manifest);
    const saved = await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    expect(assertWebinarPublisherProjection(saved.summary.projection)).toEqual(
      saved.summary.projection,
    );
    expect(saved.summary.projection.destination.sourceRevision).toBe(
      f.current.version.manifest.blueprintId === "webinar-ad"
        ? f.current.version.manifest.destination.sourceRevision
        : "unexpected",
    );
    expect(saved.summary.projection.creative.digest).toBe("6".repeat(64));
    expect(canonicalCampaignHash(f.current.version.manifest)).toBe(manifestBefore);
    expect(f.current.version.manifest.meta.enabled).toBe(false);
    expect(f.outbox).toEqual([]);
  });
  it("reserves a confirmed draft with one atomically supplied safe outbox task and permits exact replay", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const command = f.command();
    const first = await executeWebinarPublisherCommand(command, f.principal, f.ports);
    expect(first).toMatchObject({ action: "draft", state: "reserved", duplicate: false });
    expect(await executeWebinarPublisherCommand(command, f.principal, f.ports)).toMatchObject({
      ...first,
      duplicate: true,
    });
    expect(f.outbox).toHaveLength(1);
    expect(JSON.stringify(f.outbox)).not.toMatch(/token|publicUrl|wire|copy|media/u);
  });
  it.each(["confirmationHash", "expectedRowVersion", "expectedProjectionHash"] as const)(
    "refuses stale %s without reservation",
    async (field) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      await expect(
        executeWebinarPublisherCommand(
          { ...f.command(), [field]: field === "expectedRowVersion" ? 9 : "f".repeat(64) },
          f.principal,
          f.ports,
        ),
      ).rejects.toThrow();
      expect(f.outbox).toHaveLength(0);
    },
  );
  it.each(["accountLabel", "assets", "geographies"] as const)(
    "refuses resolved %s drift against reviewed projection",
    async (field) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      f.setResolved(
        field === "assets"
          ? { assets: { ...f.resolved.assets, pageId: "999999" } }
          : field === "geographies"
            ? { geographies: [{ ...f.resolved.geographies[0]!, approvedPlace: "TX" }] }
            : { accountLabel: "Changed account label" },
      );
      await expect(
        executeWebinarPublisherCommand(f.command(), f.principal, f.ports),
      ).rejects.toThrow();
      expect(f.outbox).toHaveLength(0);
    },
  );
  it("rechecks withdrawal on an earlier successful exact request", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const command = f.command();
    await executeWebinarPublisherCommand(command, f.principal, f.ports);
    f.withdraw();
    await expect(executeWebinarPublisherCommand(command, f.principal, f.ports)).rejects.toThrow(
      "withdrawn",
    );
    expect(f.outbox).toHaveLength(1);
  });
  it("checks current owner on a successful exact request", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const command = f.command();
    await executeWebinarPublisherCommand(command, f.principal, f.ports);
    f.setOwner({ ...f.principal, role: "viewer", roleVersion: 2 });
    await expect(executeWebinarPublisherCommand(command, f.principal, f.ports)).rejects.toThrow(
      "principal",
    );
    expect(f.outbox).toHaveLength(1);
  });
  it("refuses synthetic provider proof under the default production authority", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.synthetic();
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "PROVIDER_CONTRACT_UNQUALIFIED",
    );
    expect(f.outbox).toHaveLength(0);
  });
  it("allows pause after expiry and withdrawal using only owned confirmed campaign identity", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.setLaunch({
      ...f.launch,
      state: "live",
      nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
    });
    f.expire();
    f.withdraw();
    expect(
      await executeWebinarPublisherCommand(f.command("pause"), f.principal, f.ports),
    ).toMatchObject({ action: "pause", state: "reserved" });
    expect(f.outbox).toHaveLength(1);
  });
  it("refuses resume after expiry and refuses foreign native IDs even for pause", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.setLaunch({
      ...f.launch,
      state: "paused",
      nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
    });
    f.expire();
    await expect(
      executeWebinarPublisherCommand(f.command("resume"), f.principal, f.ports),
    ).rejects.toThrow();
    f.foreign();
    await expect(
      executeWebinarPublisherCommand(f.command("pause"), f.principal, f.ports),
    ).rejects.toThrow("foreign");
    expect(f.outbox).toHaveLength(0);
  });
  it("serializes concurrent different commands with a lineage CAS and has one reservation", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const results = await Promise.allSettled([
      executeWebinarPublisherCommand(f.command(), f.principal, f.ports),
      executeWebinarPublisherCommand(
        f.command("draft", "00000000-0000-4000-8000-000000000022"),
        f.principal,
        f.ports,
      ),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(f.outbox).toHaveLength(1);
  });
  it("propagates a failed atomic persistence command with no task or false success", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.failTransaction();
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "rolled back",
    );
    expect(f.outbox).toHaveLength(0);
    expect(f.operations.size).toBe(0);
  });
  it.each(["publish", "resume", "cancel"] as const)(
    "reserves an explicitly confirmed %s without claiming remote success",
    async (action) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      if (action !== "cancel")
        f.setLaunch({
          ...f.launch,
          state: action === "publish" ? "draft_ready" : "paused",
          nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
        });
      expect(
        await executeWebinarPublisherCommand(f.command(action), f.principal, f.ports),
      ).toMatchObject({ state: "reserved", action });
      expect(f.outbox).toHaveLength(1);
    },
  );
  it.each(["draft", "publish", "pause", "resume", "cancel"] as const)(
    "refuses %s in an incompatible current lineage state",
    async (action) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      f.setLaunch({
        ...f.launch,
        state: "cancelled",
        ...(action === "pause"
          ? { nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" } }
          : {}),
      });
      await expect(
        executeWebinarPublisherCommand(f.command(action), f.principal, f.ports),
      ).rejects.toThrow("ACTION_NOT_READY");
      expect(f.outbox).toHaveLength(0);
    },
  );
  it("refuses a changed confirmation using an already reserved request UUID", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const command = f.command();
    await executeWebinarPublisherCommand(command, f.principal, f.ports);
    await expect(
      executeWebinarPublisherCommand(
        { ...command, confirmationHash: "f".repeat(64) },
        f.principal,
        f.ports,
      ),
    ).rejects.toThrow("REQUEST_CONFLICT");
    expect(f.outbox).toHaveLength(1);
  });
  it.each(["campaignVersionRef", "expectedManifestHash", "expectedPreflightHash"] as const)(
    "refuses changed summary hint %s",
    async (field) => {
      const f = await fixture();
      await expect(
        prepareWebinarPublisherSummary(
          {
            ...f.request,
            [field]: field === "campaignVersionRef" ? "version_changed001" : "f".repeat(64),
          },
          f.principal,
          f.ports,
        ),
      ).rejects.toThrow("STALE_EVIDENCE");
    },
  );
  it.each([
    "actorId",
    "actorRef",
    "locationId",
    "locationRef",
    "installationRef",
    "sessionId",
    "authenticationMode",
  ] as const)("refuses changed current principal %s", async (field) => {
    const f = await fixture();
    f.setOwner({
      ...f.principal,
      [field]:
        field === "actorId" || field === "locationId"
          ? "00000000-0000-4000-8000-000000000099"
          : field === "authenticationMode"
            ? "local_synthetic"
            : "reference_foreign001",
    });
    await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
      "principal",
    );
  });
  it("allows explicitly injected offline tests without making them production evidence", async () => {
    const f = await fixture();
    f.setOwner({ ...f.principal, authenticationMode: "local_synthetic" });
    f.ports.executionMode = "offline";
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.synthetic();
    expect(await executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).toMatchObject({
      state: "reserved",
    });
  });
  it("refuses a missing campaign or launch without exposing another tenant", async () => {
    const f = await fixture();
    f.tx.loadCurrentEvidence = async () => undefined;
    await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
      "accessible",
    );
    const g = await fixture();
    await prepareWebinarPublisherSummary(g.request, g.principal, g.ports);
    g.tx.loadLaunch = async () => undefined;
    await expect(executeWebinarPublisherCommand(g.command(), g.principal, g.ports)).rejects.toThrow(
      "accessible",
    );
  });
  it.each(["locationRef", "createdBy", "campaignRef"] as const)(
    "refuses foreign saved campaign %s",
    async (field) => {
      const f = await fixture();
      f.setEvidence({
        ...f.current,
        version: { ...f.current.version, [field]: "reference_foreign001" },
      });
      await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
        "accessible",
      );
    },
  );
  it.each([
    "decision",
    "locationRef",
    "campaignRef",
    "campaignVersionRef",
    "manifestHash",
    "preflightResultHash",
    "actorRef",
    "actorRole",
    "decidedAt",
  ] as const)("refuses changed approval provenance %s", async (field) => {
    const f = await fixture();
    const value =
      field === "decision"
        ? "rejected"
        : field === "actorRole"
          ? "approver"
          : field === "decidedAt"
            ? "2026-10-02T00:00:00.000Z"
            : field.endsWith("Hash")
              ? "f".repeat(64)
              : "reference_foreign001";
    f.setEvidence({ ...f.current, approval: { ...f.current.approval, [field]: value } });
    await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
      "STALE_EVIDENCE",
    );
  });
  it("refuses a forged approval snapshot even when its version hashes match", async () => {
    const f = await fixture();
    const snapshot = f.current.approval.snapshot;
    if (!("blueprintId" in snapshot) || snapshot.blueprintId !== "webinar-ad")
      throw new Error("wrong fixture");
    f.setEvidence({
      ...f.current,
      approval: { ...f.current.approval, snapshot: { ...snapshot, squareSha256: "f".repeat(64) } },
    });
    await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
      "STALE_EVIDENCE",
    );
  });
  it.each(["creative", "count", "reference", "exclude", "missing-place"] as const)(
    "refuses unreviewed resolved geography or %s",
    async (mutation) => {
      const f = await fixture();
      if (mutation === "creative") f.request.selection.creativeAssetRef = "asset_foreign001";
      if (mutation === "count") f.request.selection.geographyRefs.push("geography_other001");
      if (mutation === "reference")
        f.setResolved({
          geographies: [{ ...f.resolved.geographies[0]!, selectionRef: "geography_other001" }],
        });
      if (mutation === "exclude")
        f.setResolved({
          geographies: [{ ...f.resolved.geographies[0]!, selectionType: "exclude" }],
        });
      if (mutation === "missing-place") {
        const first = f.resolved.geographies[0]!;
        f.request.selection.geographyRefs.push("geography_other001");
        f.setResolved({
          geographies: [first, { ...first, key: "99999", selectionRef: "geography_other001" }],
        });
      }
      await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
        "STALE_EVIDENCE",
      );
    },
  );
  it("refuses duplicate resolver selection references", async () => {
    const f = await fixture();
    const first = f.resolved.geographies[0]!;
    f.request.selection.geographyRefs.push("geography_other001");
    f.setResolved({ geographies: [first, { ...first, key: "99999" }] });
    await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
      "STALE_EVIDENCE",
    );
  });
  it.each(["summary", "row", "state", "ids"] as const)(
    "refuses corrupted summary persistence %s",
    async (mutation) => {
      const f = await fixture();
      const original = f.tx.insertSummary;
      f.tx.insertSummary = async (summary) => {
        const saved = WebinarPublisherLaunchRecordSchema.parse(await original(summary));
        return mutation === "summary"
          ? { ...saved, summary: { ...saved.summary, pageLabel: "Corrupted label" } }
          : mutation === "row"
            ? { ...saved, rowVersion: 2 }
            : mutation === "state"
              ? { ...saved, state: "live" }
              : { ...saved, nativeIds: { ...saved.nativeIds, campaignId: "campaign123" } };
      };
      await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
        "STALE_EVIDENCE",
      );
    },
  );
  it.each(["locationRef", "createdBy"] as const)(
    "refuses inaccessible stored projection %s",
    async (field) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      const command = f.command();
      f.setLaunch({
        ...f.launch,
        summary: {
          ...f.launch.summary,
          projection: { ...f.launch.summary.projection, [field]: "reference_foreign001" },
        },
      });
      await expect(executeWebinarPublisherCommand(command, f.principal, f.ports)).rejects.toThrow(
        "accessible",
      );
    },
  );
  it("refuses projection tampering even with a freshly recomputed outer summary hash", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const command = f.command();
    const { summaryHash: _discard, ...body } = f.launch.summary;
    body.projection = { ...body.projection, brandHash: "f".repeat(64) };
    f.setLaunch({ ...f.launch, summary: { ...body, summaryHash: canonicalCampaignHash(body) } });
    await expect(executeWebinarPublisherCommand(command, f.principal, f.ports)).rejects.toThrow(
      "STALE_EVIDENCE",
    );
  });
  it("refuses a launch resolved for a different projection reference", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    await expect(
      executeWebinarPublisherCommand(
        { ...f.command(), projectionRef: "projection_other001" },
        f.principal,
        f.ports,
      ),
    ).rejects.toThrow("STALE_EVIDENCE");
  });
  it("refuses changed page display evidence", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.setResolved({ pageLabel: "Changed page" });
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "STALE_EVIDENCE",
    );
  });
  it("refuses an unqualified proof, and a hard-cap model that lacks native representation", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.ports.provider.assertCurrent = async () => undefined;
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "PROVIDER_CONTRACT_UNQUALIFIED",
    );
    const g = await fixture();
    g.setResolved({ totalSemantics: "hard_cap" });
    await prepareWebinarPublisherSummary(g.request, g.principal, g.ports);
    await expect(executeWebinarPublisherCommand(g.command(), g.principal, g.ports)).rejects.toThrow(
      "PROVIDER_CONTRACT_UNQUALIFIED",
    );
  });
  it("refuses corruption of the committed operation without reporting a successful reservation", async () => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const reserve = f.tx.reserveCommand;
    f.tx.reserveCommand = async (input) => ({
      ...input.operation,
      operationRef: "operation_wrong001",
    });
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "REQUEST_CONFLICT",
    );
    expect(f.outbox).toHaveLength(0);
    f.tx.reserveCommand = reserve;
  });
  it.each(["adAccountRef", "pageRef"] as const)(
    "rejects a resolver result from a different selected %s",
    async (field) => {
      const f = await fixture();
      f.setResolved({ [field]: "selection_wrong001" });
      await expect(prepareWebinarPublisherSummary(f.request, f.principal, f.ports)).rejects.toThrow(
        "STALE_EVIDENCE",
      );
      expect(f.outbox).toEqual([]);
    },
  );
  it.each([
    "projectionHash",
    "wireMappingHash",
    "locationId",
    "adAccountId",
    "pageId",
    "timezone",
    "observedAt",
    "expiresAt",
    "budget",
    "schedule",
  ] as const)("rejects non-current qualified provider evidence %s", async (field) => {
    const f = await fixture();
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    const original = f.ports.provider.assertCurrent;
    f.ports.provider.assertCurrent = async (input) => {
      const raw = await original(input);
      if (typeof raw !== "object" || raw === null) throw new Error("Wrong proof fixture");
      const patch: Record<string, unknown> = field.endsWith("Hash")
        ? { [field]: "f".repeat(64) }
        : field === "timezone"
          ? { timezone: "UTC" }
          : field === "observedAt"
            ? { observedAt: "2026-10-02T00:00:00.000Z" }
            : field === "expiresAt"
              ? { expiresAt: WEBINAR_NOW.toISOString(), observedAt: "2026-10-01T16:00:00.000Z" }
              : field === "budget"
                ? {
                    budget: {
                      mode: "DAILY",
                      amountMajor: 999,
                      totalSemantics: "estimated_ceiling",
                      requestHash: "e".repeat(64),
                      readBackHash: "f".repeat(64),
                    },
                  }
                : field === "schedule"
                  ? {
                      schedule: {
                        format: "offset_datetime",
                        requestEnd: "2026-10-11T00:00:00.000Z",
                        observedStop: "2026-10-11T00:00:00.000Z",
                        requestHash: "e".repeat(64),
                        readBackHash: "f".repeat(64),
                      },
                    }
                  : {
                      [field]:
                        field === "adAccountId"
                          ? "act_999999"
                          : field === "pageId"
                            ? "999999"
                            : "native_foreign001",
                    };
      return { ...raw, ...patch };
    };
    await expect(executeWebinarPublisherCommand(f.command(), f.principal, f.ports)).rejects.toThrow(
      "PROVIDER_CONTRACT_UNQUALIFIED",
    );
    expect(f.outbox).toEqual([]);
  });
  it.each(["missing", "synthetic", "foreign-campaign", "expired"] as const)(
    "refuses %s stop-spend transport qualification",
    async (mutation) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      f.setLaunch({
        ...f.launch,
        state: "live",
        nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
      });
      if (mutation === "synthetic") f.synthetic();
      const original = f.ports.provider.assertCurrent;
      f.ports.provider.assertCurrent = async (input) => {
        if (mutation === "missing") return undefined;
        const raw = await original(input);
        if (typeof raw !== "object" || raw === null) throw new Error("wrong fixture");
        return mutation === "foreign-campaign"
          ? { ...raw, campaignId: "campaign_foreign001" }
          : mutation === "expired"
            ? {
                ...raw,
                observedAt: "2026-10-01T16:00:00.000Z",
                expiresAt: WEBINAR_NOW.toISOString(),
              }
            : raw;
      };
      await expect(
        executeWebinarPublisherCommand(f.command("pause"), f.principal, f.ports),
      ).rejects.toThrow("PROVIDER_CONTRACT_UNQUALIFIED");
      expect(f.outbox).toEqual([]);
    },
  );
  it("can test pause with an explicit offline control fixture", async () => {
    const f = await fixture();
    f.ports.executionMode = "offline";
    await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
    f.setLaunch({
      ...f.launch,
      state: "live",
      nativeIds: { campaignId: "campaign123", adsetId: "adset123", adId: "ad123" },
    });
    f.synthetic();
    expect(
      await executeWebinarPublisherCommand(f.command("pause"), f.principal, f.ports),
    ).toMatchObject({ state: "reserved" });
  });
  it.each(["projectionRef", "expectedRowVersion", "confirmationHash"] as const)(
    "refuses mismatched persisted replay identity %s",
    async (field) => {
      const f = await fixture();
      await prepareWebinarPublisherSummary(f.request, f.principal, f.ports);
      const command = f.command();
      await executeWebinarPublisherCommand(command, f.principal, f.ports);
      const operation = f.operations.get(command.requestId)!;
      f.operations.set(command.requestId, {
        ...operation,
        [field]:
          field === "expectedRowVersion"
            ? 99
            : field === "confirmationHash"
              ? "f".repeat(64)
              : "projection_foreign001",
      });
      await expect(executeWebinarPublisherCommand(command, f.principal, f.ports)).rejects.toThrow(
        "REQUEST_CONFLICT",
      );
      expect(f.outbox).toHaveLength(1);
    },
  );
});
