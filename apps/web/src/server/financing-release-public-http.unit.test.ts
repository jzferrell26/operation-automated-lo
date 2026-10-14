import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalCampaignHash as hash,
  FinancingReleaseError,
  prepareFinancingRelease,
  transitionFinancingRelease,
  type FinancingReleasePorts,
  type FinancingReleaseTransaction,
} from "@oalo/application";
import { type FinancingReleaseRecord } from "@oalo/contracts";
import { outputFixture } from "./financing-release-output-fixture.js";
import { createPublicFinancingHttp } from "./financing-release-public-http.js";
import { publicMediaRef } from "./financing-release-html.js";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function fixture(photo = false) {
  const mediaBytes = Uint8Array.from([1, 2, 3, 4]);
  const input = outputFixture(
      3,
      photo
        ? [
            {
              bytes: mediaBytes,
              mimeType: "image/png",
              sha256: createHash("sha256").update(mediaBytes).digest("hex"),
            },
          ]
        : [],
    ),
    source = input.source,
    authority = source.authority;
  let clock = new Date(),
    record: FinancingReleaseRecord | undefined;
  const site = Buffer.from(
    "<!doctype html><html><head><style>body{color:#123}</style></head><body>Synthetic sealed report</body></html>",
  );
  const pdf = Buffer.from("%PDF synthetic controlled seam, not actual PDF qualification");
  const artifacts = new Map<string, Uint8Array>();
  const captures = new Map<string, { hash: string; receipt: unknown }>();
  const evidence = vi.fn(async () => undefined);
  const tx: FinancingReleaseTransaction = {
    reserve: async () => ({ state: "new" }),
    load: async () => record,
    save: async (value) => {
      record = value;
    },
    assertEvidenceCurrent: evidence,
    complete: async () => undefined,
    capture: vi.fn(async (value) => {
      const previous = captures.get(value.request.requestId);
      if (previous) {
        if (previous.hash !== value.contentHash) throw new FinancingReleaseError("CONFLICT", 409);
        return previous.receipt;
      }
      const receipt = {
        inquiryId: uuid(90),
        publicationId: value.snapshot.publicationId,
        requestId: value.request.requestId,
        acceptedAt: value.acceptedAt,
        expiresAt: value.expiresAt,
        deliveryState: "pending",
      };
      captures.set(value.request.requestId, { hash: value.contentHash, receipt });
      return receipt;
    }),
  };
  const ports: FinancingReleasePorts = {
    now: () => clock,
    newReleaseRef: () => "release_http0001",
    newPublicationId: () => input.publicationId,
    authorize: async () => undefined,
    resolve: vi.fn(async () => source),
    readMedia: vi.fn(async () => mediaBytes),
    assertNormalizedMedia: vi.fn(async () => undefined),
    render: async (plan) => [
      {
        kind: "site",
        mimeType: "text/html",
        artifactRef: "artifact_httpsite01",
        rendererVersion: "controlled-http-seam",
        bindingHash: hash(plan),
        bytes: site,
      },
      {
        kind: "pdf",
        mimeType: "application/pdf",
        artifactRef: "artifact_httppdf001",
        rendererVersion: "controlled-http-seam",
        bindingHash: hash(plan),
        bytes: pdf,
      },
    ],
    assertOutputParity: vi.fn(async () => undefined),
    putOutput: async (seal, bytes) => {
      artifacts.set(seal.artifactRef, bytes);
    },
    readOutput: vi.fn(async (seal) => artifacts.get(seal.artifactRef)!),
    transaction: async (_location, work) => work(tx),
    findPublication: vi.fn(async () => record),
  };
  const principal = {
    actorRef: source.sourceVersion.createdBy,
    locationRef: source.sourceVersion.locationRef,
  };
  const prepared = await prepareFinancingRelease(
    {
      requestId: uuid(1),
      campaignRef: source.sourceVersion.campaignRef,
      campaignVersionRef: source.sourceVersion.campaignVersionRef,
      propertyVersionRef: authority.propertyVersionRef,
      partnerVersionRef: authority.partnerVersionRef,
      lenderIdentityVersionRef: authority.lenderIdentityVersionRef,
      presetVersionRef: authority.presetVersionRef,
      disclosureVersionRef: authority.disclosureVersionRef,
      templateVersionRef: authority.templateVersionRef,
      routingProfileVersionRef: authority.routingProfileVersionRef,
      consentVersionRef: authority.consentVersionRef,
      expectedEvidenceHash: hash(authority),
    },
    principal,
    ports,
  );
  const transition = (r: FinancingReleaseRecord, n: number) => ({
    requestId: uuid(n),
    releaseRef: r.snapshot.releaseRef,
    expectedRevision: r.revision,
    expectedBundleHash: r.snapshot.bundleHash,
    expectedEvidenceHash: r.snapshot.evidenceHash,
  });
  const approved = await transitionFinancingRelease(
    "approve",
    transition(prepared, 2),
    principal,
    ports,
  );
  await transitionFinancingRelease("publish", transition(approved, 3), principal, ports);
  const admit = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 }));
  const resolve = vi.fn(async () => ({ canonicalOrigin: authority.origin.canonicalOrigin, ports }));
  const http = createPublicFinancingHttp({
    resolve,
    nonceKey: new Uint8Array(32).fill(7),
    admitInquiry: admit,
    newRequestId: () => uuid(42),
  });
  const url = `${authority.origin.canonicalOrigin}/p/${input.publicationId}`;
  const read = (suffix = "", init?: RequestInit) =>
    http.read(new Request(url + suffix, init), input.publicationId, suffix);
  const body = new URLSearchParams({
    firstName: "Synthetic",
    email: "example@example.org",
    intent: "property-information",
    honeypot: "",
    consent: "true",
  });
  const post = (cookie: string, change?: URLSearchParams, extra?: RequestInit) =>
    http.inquiry(
      new Request(url + "/inquiry", {
        method: "POST",
        body: change ?? body,
        headers: {
          origin: authority.origin.canonicalOrigin,
          cookie,
          "content-type": "application/x-www-form-urlencoded",
        },
        ...extra,
      }),
      input.publicationId,
    );
  return {
    http,
    ports,
    tx,
    admit,
    resolve,
    read,
    post,
    url,
    body,
    site,
    pdf,
    input,
    mediaBytes,
    artifacts,
    captures,
    evidence,
    record: () => record!,
    setRecord: (next: FinancingReleaseRecord) => {
      record = next;
    },
    setClock: (next: Date) => {
      clock = next;
    },
  };
}
const cookie = (response: Response) => response.headers.get("set-cookie")!.split(";")[0]!;
describe("public financing HTTP consumer", () => {
  it("returns exact sealed bytes with no-store and immutable style hash CSP", async () => {
    const f = await fixture(),
      response = await f.read();
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(f.site);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-security-policy")).toContain("script-src 'none'");
    expect(response.headers.get("content-security-policy")).toMatch(/style-src 'sha256-/u);
    expect(response.headers.get("set-cookie")).toContain("Secure; HttpOnly; SameSite=Strict");
    expect(f.evidence).toHaveBeenCalled();
  });
  it("downloads only the exact sealed PDF and returns byte-free HEAD", async () => {
    const f = await fixture(),
      response = await f.read("/report.pdf");
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(f.pdf);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.has("set-cookie")).toBe(false);
    const head = await f.read("", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-length")).toBe(String(f.site.length));
    expect(head.headers.has("set-cookie")).toBe(false);
  });
  it("serves only an exact currently authorized media projection without a private URL", async () => {
    const f = await fixture(true),
      reference = publicMediaRef(f.input, 0);
    const response = await f.read(`/media/${reference}`);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(f.mediaBytes));
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(f.ports.assertNormalizedMedia).toHaveBeenCalled();
  });
  it("withholds media after byte corruption or failed normalization", async () => {
    const f = await fixture(true),
      reference = publicMediaRef(f.input, 0);
    vi.mocked(f.ports.readMedia).mockResolvedValue(Uint8Array.from([5]));
    expect((await f.read(`/media/${reference}`)).status).toBe(404);
    const g = await fixture(true);
    vi.mocked(g.ports.assertNormalizedMedia).mockRejectedValue(new Error("unqualified bytes"));
    expect((await g.read(`/media/${publicMediaRef(g.input, 0)}`)).status).toBe(404);
  });
  it.each(["revoked", "rejected", "prepared"] as const)(
    "withholds all report bytes for %s",
    async (state) => {
      const f = await fixture();
      const r = f.record();
      f.setRecord({
        ...r,
        state,
        ...(state === "revoked"
          ? { revokedAt: new Date().toISOString(), revokedBy: r.snapshot.actorRef }
          : {}),
        ...(state === "prepared" || state === "rejected" ? { approval: null } : {}),
      });
      for (const resource of ["", "/report.pdf", `/media/${"a".repeat(64)}`]) {
        const response = await f.read(resource);
        expect(response.status).toBe(404);
        expect(await response.text()).toBe("This report is unavailable.");
        expect(response.headers.has("set-cookie")).toBe(false);
      }
    },
  );
  it("refuses expiry and current evidence withdrawal before returning bytes", async () => {
    const f = await fixture();
    f.setClock(new Date(f.record().snapshot.validUntil));
    expect((await f.read()).status).toBe(404);
    const g = await fixture();
    g.evidence.mockRejectedValue(new Error("private evidence detail"));
    const response = await g.read();
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("private");
  });
  it("rechecks evidence after the read while the same transaction remains held", async () => {
    const f = await fixture();
    f.evidence.mockClear();
    f.evidence
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("withdrawn at return boundary"));
    expect((await f.read()).status).toBe(404);
    expect(f.evidence).toHaveBeenCalledTimes(2);
  });
  it("refuses altered output bytes, guessed media and unsupported resources", async () => {
    const f = await fixture();
    f.artifacts.set("artifact_httpsite01", Buffer.from("Changed"));
    expect((await f.read()).status).toBe(404);
    expect((await f.read(`/media/${"a".repeat(64)}`)).status).toBe(404);
    expect((await f.read("/private-artifact")).status).toBe(404);
  });
  it("refuses a foreign origin even when the resolver returns a valid publication", async () => {
    const f = await fixture();
    const response = await f.http.read(
      new Request(f.url.replace(new URL(f.url).origin, "https://foreign.example")),
      f.record().snapshot.publicationId,
    );
    expect(response.status).toBe(404);
  });
  it("preserves server request identity across reload and exact response-loss retry", async () => {
    const f = await fixture(),
      first = await f.read(),
      saved = cookie(first);
    const reload = await f.read("", { headers: { cookie: saved } });
    expect(cookie(reload)).toBe(saved);
    expect((await f.post(saved)).status).toBe(202);
    expect((await f.post(saved)).status).toBe(202);
    expect(f.captures.size).toBe(1);
    expect([...f.captures.keys()]).toEqual([uuid(42)]);
  });
  it("reports capture separately from provider delivery", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    const response = await f.post(saved);
    expect(await response.text()).toBe("Your request was saved. Delivery is pending.");
  });
  it.each([
    ["delivered", "Your request was delivered."],
    ["in_progress", "Your request was saved. Delivery is in progress."],
    ["failed", "Your request was saved. Delivery could not be completed."],
    ["uncertain", "Your request was saved. Delivery needs review."],
    ["blocked", "Your request was saved. Delivery is paused."],
  ])("preserves the actual %s delivery outcome in customer copy", async (state, message) => {
    const f = await fixture(),
      saved = cookie(await f.read());
    vi.mocked(f.tx.capture).mockImplementation(async (input) => ({
      inquiryId: uuid(90),
      publicationId: input.snapshot.publicationId,
      requestId: input.request.requestId,
      acceptedAt: input.acceptedAt,
      expiresAt: input.expiresAt,
      deliveryState: state,
    }));
    const response = await f.post(saved);
    expect(response.status).toBe(202);
    expect(await response.text()).toBe(message);
  });
  it.each(["absent", "altered", "duplicate", "expired"])(
    "refuses %s nonce without capture",
    async (mode) => {
      const f = await fixture();
      let saved = cookie(await f.read());
      if (mode === "absent") saved = "";
      if (mode === "altered") saved += "x";
      if (mode === "duplicate") saved += `; ${saved}`;
      if (mode === "expired") f.setClock(new Date(Date.now() + 901000));
      expect((await f.post(saved)).status).toBe(403);
      expect(f.tx.capture).not.toHaveBeenCalled();
      expect(f.admit).not.toHaveBeenCalled();
    },
  );
  it.each(["extra", "duplicate", "no-consent", "honeypot", "invalid-email"])(
    "refuses %s form",
    async (mode) => {
      const f = await fixture(),
        saved = cookie(await f.read()),
        body = new URLSearchParams(f.body);
      if (mode === "extra") body.set("locationRef", "location_foreign01");
      if (mode === "duplicate") body.append("email", "second@example.org");
      if (mode === "no-consent") body.delete("consent");
      if (mode === "honeypot") body.set("honeypot", "filled");
      if (mode === "invalid-email") body.set("email", "invalid");
      expect((await f.post(saved, body)).status).toBe(400);
      expect(f.tx.capture).not.toHaveBeenCalled();
    },
  );
  it("refuses cross-origin form POST and oversized streaming body", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    expect(
      (
        await f.post(saved, undefined, {
          headers: {
            origin: "https://foreign.example",
            cookie: saved,
            "content-type": "application/x-www-form-urlencoded",
          },
        })
      ).status,
    ).toBe(403);
    const big = new URLSearchParams(f.body);
    big.set("firstName", "x".repeat(6000));
    expect((await f.post(saved, big)).status).toBe(413);
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
  it("requires native rate admission and refuses a withdrawn publication after GET", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    f.admit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const limited = await f.post(saved);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect(f.tx.capture).not.toHaveBeenCalled();
    f.admit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    f.setClock(new Date(f.record().snapshot.validUntil));
    expect((await f.post(saved)).status).toBe(403);
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
  it("preserves the actual full-day native quota refusal", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    f.admit.mockResolvedValue({ allowed: false, retryAfterSeconds: 86400 });
    const response = await f.post(saved);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("86400");
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
  it.each([0, 86401, Number.NaN])(
    "refuses out-of-range native retry delay %s",
    async (retryAfterSeconds) => {
      const f = await fixture(),
        saved = cookie(await f.read());
      f.admit.mockResolvedValue({ allowed: false, retryAfterSeconds });
      expect((await f.post(saved)).status).toBe(503);
      expect(f.tx.capture).not.toHaveBeenCalled();
    },
  );
  it("does not accept an unconfigured nonce key", () => {
    expect(() =>
      createPublicFinancingHttp({
        resolve: async () => {
          throw new Error();
        },
        admitInquiry: async () => false,
        nonceKey: new Uint8Array(0),
      }),
    ).toThrow();
  });
  it("checks the actual current clock again after artifact reads", async () => {
    const f = await fixture();
    let calls = 0;
    const original = f.ports.readOutput;
    vi.mocked(original).mockClear();
    vi.mocked(f.ports.readOutput).mockImplementation(async (seal) => {
      const bytes = f.artifacts.get(seal.artifactRef)!;
      if (++calls === 3) f.setClock(new Date(f.record().snapshot.validUntil));
      return bytes;
    });
    expect((await f.read()).status).toBe(404);
    expect(original).toHaveBeenCalledTimes(3);
  });
  it("refuses an inquiry after publication withdrawal despite a valid unexpired cookie", async () => {
    const f = await fixture(),
      saved = cookie(await f.read()),
      r = f.record();
    f.setRecord({
      ...r,
      state: "revoked",
      revokedAt: new Date().toISOString(),
      revokedBy: r.snapshot.actorRef,
    });
    const response = await f.post(saved);
    expect(response.status).toBe(404);
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
  it("refuses unsupported form content types without reading or capturing", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    const response = await f.post(saved, undefined, {
      headers: { cookie: saved, origin: new URL(f.url).origin, "content-type": "application/json" },
    });
    expect(response.status).toBe(415);
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
  it("returns an explicit conflict for changed inquiry content on the same retry identity", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    expect((await f.post(saved)).status).toBe(202);
    const changed = new URLSearchParams(f.body);
    changed.set("email", "changed@example.org");
    expect((await f.post(saved, changed)).status).toBe(409);
    expect(f.captures.size).toBe(1);
  });
  it("refuses unavailable native quota checks with a sanitized temporary failure", async () => {
    const f = await fixture(),
      saved = cookie(await f.read());
    f.admit.mockRejectedValue(new Error("private database or provider detail"));
    const response = await f.post(saved);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(f.tx.capture).not.toHaveBeenCalled();
  });
});
