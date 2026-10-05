import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { PropertyPackageResponseSchema } from "@oalo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import {
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
} from "./authenticated-principal.js";
import {
  handlePropertyPackageGeneration,
  handlePropertyPackageOutput,
} from "./property-package-http.js";
import { createPropertyPackageStore } from "./property-package-store.js";
import * as packageStoreModule from "./property-package-store.js";
import {
  generatePropertyPackage,
  propertyPackageOrigin,
  readVerifiedPropertyPackage,
} from "./property-package-service.js";
import { propertyPackageDocument } from "./property-package-content.js";
import { propertyDraftHtml } from "./property-package-html.js";
import { verifyPropertyPackage } from "./property-package-render.js";
import { packagePostRequest, savedPropertyFixture } from "./property-package.test-support.js";
import { loadCampaignPage } from "./campaign-workspace-reads.js";

const temporary = createTemporaryCampaignStore("oalo-package-");
afterEach(async () => {
  await temporary.restore();
  vi.restoreAllMocks();
});
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("real private package generation and readback", () => {
  it("renders four complete outputs from the saved source, including a real PDF and QR", async () => {
    await temporary.enter();
    const environment = temporary.env();
    const { request, version, principal } = await savedPropertyFixture(environment);
    const network = vi.spyOn(globalThis, "fetch");
    const response = await handlePropertyPackageGeneration(
      packagePostRequest(request),
      environment,
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const summary = PropertyPackageResponseSchema.parse(await response.json());
    expect(summary.providerPublicationAuthorized).toBe(false);
    const packageStore = createPropertyPackageStore(principal, environment);
    const result = await readVerifiedPropertyPackage(version, packageStore);
    if (!result) throw new Error("No persisted package");
    expect(result.sourceManifestHash).toBe(version.manifestHash);
    expect(result.outputs.page.content).toContain("615 Example Lane");
    expect(result.outputs.page.content).toContain("Jordan Sample");
    expect(result.outputs.page.content).toContain("Prairie Home Lending");
    expect(result.outputs.page.content).toContain("NOT CONFIRMED");
    expect(result.outputs.page.content).not.toContain("<form");
    expect(result.outputs.page.content).not.toContain("<script");
    expect(result.outputs.copy.content).toContain("SOCIAL POST DRAFT");
    expect(result.outputs.copy.content).toContain("EMAIL DRAFT");
    expect(result.outputs.copy.content).toContain("SMS DRAFT");
    expect(result.outputs.qr.content).toContain("INTERNAL REVIEW ONLY");
    expect(result.outputs.qr.content).toContain("Property permission: NOT CONFIRMED");
    expect(result.outputs.qr.content).toContain("Realtor permission: NOT CONFIRMED");
    expect(result.qrDestination).toBe(
      `http://127.0.0.1:3100/api/campaigns/property/package/${request.campaignRef}/${request.campaignVersionRef}/page`,
    );
    expect(result.qrDestination).not.toMatch(/615|Jordan|token|secret/iu);
    const pdf = Buffer.from(result.outputs.flyer.base64, "base64");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(result.outputs.flyer.pageCount);
    expect(result.outputs.flyer.pageCount).toBe(1);
    expect(network).not.toHaveBeenCalled();

    // Ephemeral render/QR-decoding evidence. No real customer or credential data.
    const dir = "test-results/property-package-proof";
    await mkdir(dir, { recursive: true });
    await Promise.all([
      writeFile(`${dir}/flyer.pdf`, pdf),
      writeFile(`${dir}/qr.svg`, result.outputs.qr.content),
      writeFile(`${dir}/page.html`, result.outputs.page.content),
      writeFile(`${dir}/copy.txt`, result.outputs.copy.content),
      writeFile(`${dir}/expected-qr.txt`, result.qrDestination),
    ]);

    for (const output of ["page", "flyer", "qr", "copy"] as const) {
      const read = await handlePropertyPackageOutput(
        new Request(result.qrDestination),
        { ...request, sourceManifestHash: undefined, output },
        environment,
        createDefaultCampaignCommandPorts(),
      );
      // Extra keys are refused, including a key whose value is undefined.
      expect(read.status).toBe(400);
      const valid = await handlePropertyPackageOutput(
        new Request(result.qrDestination),
        {
          campaignRef: request.campaignRef,
          campaignVersionRef: request.campaignVersionRef,
          output,
        },
        environment,
        createDefaultCampaignCommandPorts(),
      );
      expect(valid.status).toBe(200);
      expect(valid.headers.get("x-robots-tag")).toContain("noindex");
      expect(valid.headers.get("referrer-policy")).toBe("no-referrer");
      expect(valid.headers.get("cache-control")).toContain("no-store");
      expect(hash(new Uint8Array(await valid.arrayBuffer()))).toBe(result.outputs[output].sha256);
    }
    const page = await loadCampaignPage(principal, request.campaignRef, undefined, environment);
    expect(page).toMatchObject({
      kind: "page",
      page: { packageState: { kind: "ready", summary: { packageRef: result.packageRef } } },
    });
  });

  it("returns one immutable package after sequential and simultaneous duplicate saves", async () => {
    await temporary.enter();
    const environment = temporary.env();
    const { request, version, principal } = await savedPropertyFixture(environment);
    const invoke = () =>
      handlePropertyPackageGeneration(
        packagePostRequest(request),
        environment,
        createDefaultCampaignCommandPorts(),
      );
    const responses = await Promise.all([invoke(), invoke()]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(bodies[0]).toEqual(bodies[1]);
    const before = await createPropertyPackageStore(principal, environment).read(
      version.campaignVersionRef,
    );
    await expect((await invoke()).json()).resolves.toEqual(bodies[0]);
    expect(
      await createPropertyPackageStore(principal, environment).read(version.campaignVersionRef),
    ).toEqual(before);
  });

  it.each([
    { brand: { name: "Changed" } },
    { locationRef: "location_elsewhere001" },
    { content: "New words" },
    { approved: true },
    { propertyPermissionConfirmed: true },
  ])("refuses extra authority or output input: %j", async (extra) => {
    await temporary.enter();
    const { request, principal, version } = await savedPropertyFixture(temporary.env());
    const response = await handlePropertyPackageGeneration(
      packagePostRequest({ ...request, ...extra }),
      temporary.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(400);
    expect(
      await createPropertyPackageStore(principal, temporary.env()).read(version.campaignVersionRef),
    ).toBeUndefined();
  });

  it("refuses stale content and versions that do not exist", async () => {
    await temporary.enter();
    const { request } = await savedPropertyFixture(temporary.env());
    const stale = await handlePropertyPackageGeneration(
      packagePostRequest({ ...request, sourceManifestHash: "0".repeat(64) }),
      temporary.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(stale.status).toBe(409);
    const absent = await handlePropertyPackageGeneration(
      packagePostRequest({ ...request, campaignVersionRef: "campaignversion_unknown001" }),
      temporary.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(absent.status).toBe(404);
  });

  it("rejects a different tenant before touching package storage", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    const read = vi.fn(),
      commit = vi.fn();
    await expect(
      generatePropertyPackage(
        data.request,
        createLocalSyntheticPrincipal({ locationRef: "location_other001" }),
        temporary.env(),
        {
          campaigns: data.campaigns,
          packages: { read, commit },
        },
      ),
    ).rejects.toMatchObject({ name: "CampaignResourceNotAccessibleError" });
    expect(read).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not save partial output when the PDF cannot preserve the supplied characters", async () => {
    await temporary.enter();
    const { request, version, principal } = await savedPropertyFixture(temporary.env(), {
      description: "A fictional property described with an unsupported character: 🏡.",
    });
    const response = await handlePropertyPackageGeneration(
      packagePostRequest(request),
      temporary.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "PROPERTY_PACKAGE_FONT_UNSUPPORTED" });
    expect(
      await createPropertyPackageStore(principal, temporary.env()).read(version.campaignVersionRef),
    ).toBeUndefined();
  });

  it("escapes property markup in HTML rather than adding an executable element", async () => {
    await temporary.enter();
    const { version } = await savedPropertyFixture(temporary.env(), {
      description: 'Test property <script>alert("x")</script> with a literal & symbol.',
    });
    const html = propertyDraftHtml(propertyPackageDocument(version, "https://review.example"));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&amp; symbol");
  });

  it("surfaces storage failure without labelling the package ready", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    const commit = vi.fn(async () => {
      throw new Error("Storage unavailable");
    });
    await expect(
      generatePropertyPackage(data.request, data.principal, temporary.env(), {
        campaigns: data.campaigns,
        packages: { read: async () => undefined, commit },
      }),
    ).rejects.toThrow("Storage unavailable");
    expect(commit).toHaveBeenCalledOnce();
    expect(
      await createPropertyPackageStore(data.principal, temporary.env()).read(
        data.version.campaignVersionRef,
      ),
    ).toBeUndefined();
  });

  it("keeps the campaign readable when its package table is unavailable", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    vi.spyOn(packageStoreModule, "createPropertyPackageStore").mockReturnValue({
      read: async () => {
        throw new Error("Package table unavailable");
      },
      commit: async () => {
        throw new Error("Package table unavailable");
      },
    });
    const page = await loadCampaignPage(
      data.principal,
      data.request.campaignRef,
      undefined,
      temporary.env(),
    );
    expect(page).toMatchObject({
      kind: "page",
      page: { address: "615 Example Lane, Dallas, TX", packageState: { kind: "unavailable" } },
    });
  });

  it("detects modified stored bytes and keeps source data unchanged", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    const packages = createPropertyPackageStore(data.principal, temporary.env());
    const saved = await generatePropertyPackage(data.request, data.principal, temporary.env(), {
      campaigns: data.campaigns,
      packages,
    });
    expect(() =>
      verifyPropertyPackage({
        ...saved,
        outputs: { ...saved.outputs, copy: { ...saved.outputs.copy, content: "altered" } },
      }),
    ).toThrow("PROPERTY_PACKAGE_INTEGRITY_FAILED");
    expect(
      (await data.campaigns.getByCampaignRef(data.request.campaignRef))?.version.manifestHash,
    ).toBe(data.version.manifestHash);
  });

  it("requires an authenticated hosted session for every output", async () => {
    const response = await handlePropertyPackageOutput(
      new Request("https://app.example/private"),
      {
        campaignRef: "campaign_unknown001",
        campaignVersionRef: "campaignversion_unknown001",
        output: "page",
      },
      { OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "authorized" },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });

  it("preserves long descriptions by paginating the flyer, with a draft footer on every page", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env(), {
      description:
        "These fictional details must survive the printed page without clipping or deletion. ".repeat(
          32,
        ),
      propertyPermissionConfirmed: true,
      realtorPermissionConfirmed: true,
    });
    const bundle = await generatePropertyPackage(data.request, data.principal, temporary.env(), {
      campaigns: data.campaigns,
      packages: createPropertyPackageStore(data.principal, temporary.env()),
    });
    expect(bundle.outputs.flyer.pageCount).toBeGreaterThan(1);
    expect(bundle.outputs.qr.content).toContain("Property permission: confirmed");
    expect(bundle.outputs.qr.content).toContain("Realtor permission: confirmed");
    const document = await PDFDocument.load(Buffer.from(bundle.outputs.flyer.base64, "base64"));
    expect(document.getPageCount()).toBe(bundle.outputs.flyer.pageCount);
    await mkdir("test-results/property-package-proof", { recursive: true });
    await writeFile(
      "test-results/property-package-proof/long-flyer.pdf",
      Buffer.from(bundle.outputs.flyer.base64, "base64"),
    );
  });

  it("refuses a stored package from a different source after a commit, even when byte hashes pass", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    await expect(
      generatePropertyPackage(data.request, data.principal, temporary.env(), {
        campaigns: data.campaigns,
        packages: {
          read: async () => undefined,
          commit: async (bundle) => ({ ...bundle, sourceVersionNo: 99 }),
        },
      }),
    ).rejects.toMatchObject({ code: "PROPERTY_PACKAGE_INTEGRITY_FAILED" });
  });

  it("bounds in-process rendering and releases capacity after a renderer failure", async () => {
    await temporary.enter();
    const data = await savedPropertyFixture(temporary.env());
    const packages = createPropertyPackageStore(data.principal, temporary.env());
    let finish: ((error: Error) => void) | undefined;
    const pending = new Promise<never>((_resolve, reject) => {
      finish = reject;
    });
    const render = vi.fn(() => pending);
    const first = generatePropertyPackage(data.request, data.principal, temporary.env(), {
      campaigns: data.campaigns,
      packages,
      render,
    });
    const second = generatePropertyPackage(data.request, data.principal, temporary.env(), {
      campaigns: data.campaigns,
      packages,
      render,
    });
    const settled = Promise.allSettled([first, second]);
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(2));
    await expect(
      generatePropertyPackage(data.request, data.principal, temporary.env(), {
        campaigns: data.campaigns,
        packages,
        render,
      }),
    ).rejects.toMatchObject({ code: "PROPERTY_PACKAGE_BUSY", status: 429 });
    finish?.(new Error("Test renderer stopped"));
    expect((await settled).every((result) => result.status === "rejected")).toBe(true);
    expect(await packages.read(data.version.campaignVersionRef)).toBeUndefined();
    await expect(
      generatePropertyPackage(data.request, data.principal, temporary.env(), {
        campaigns: data.campaigns,
        packages,
      }),
    ).resolves.toMatchObject({ reviewOnly: true });
  });

  it("never derives a hosted QR origin from browser-supplied hosts or unsafe configuration", () => {
    for (const url of [
      undefined,
      "http://app.example",
      "https://user:pass@app.example",
      "https://app.example/path",
      "https://app.example/?token=test",
    ]) {
      expect(() =>
        propertyPackageOrigin({ OALO_ENVIRONMENT: "production", OALO_APP_URL: url }),
      ).toThrow("PROPERTY_PACKAGE_UNAVAILABLE");
    }
    expect(
      propertyPackageOrigin({
        OALO_ENVIRONMENT: "production",
        OALO_APP_URL: "https://app.example",
      }),
    ).toBe("https://app.example");
  });
});
