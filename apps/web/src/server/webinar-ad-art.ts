import "server-only";

import { existsSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { canonicalCampaignHash } from "@oalo/application";
import { WebinarTemplateEvidenceSchema, type WebinarTemplateEvidence } from "@oalo/contracts";
import { verifyWebinarPanel, WebinarAdRasterError } from "@oalo/rendering";

import { WEBINAR_ADS } from "../features/webinar-ads/catalog.js";

export function webinarPublicRoot(workingDirectory = process.cwd()): string {
  const application = existsSync(
    join(/* turbopackIgnore: true */ workingDirectory, "next.config.ts"),
  )
    ? workingDirectory
    : join(/* turbopackIgnore: true */ workingDirectory, "apps", "web");
  return join(/* turbopackIgnore: true */ application, "public");
}
/** Every path is derived by the caller from a fixed registry identity, never a request URL. */
export async function readContainedWebinarFile(
  publicRoot: string,
  parts: readonly string[],
  maxBytes: number,
): Promise<Readonly<{ bytes: Uint8Array; path: string }>> {
  const root = await realpath(publicRoot);
  let file = root;
  for (const part of parts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(part) || part === "." || part === "..")
      throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
    file = resolve(file, part);
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  }
  const actual = await realpath(file);
  const confined = relative(root, actual);
  if (isAbsolute(confined) || confined === ".." || confined.startsWith(`..${sep}`))
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  const stat = await lstat(actual);
  if (!stat.isFile() || stat.size <= 0 || stat.size > maxBytes)
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  const bytes = await readFile(actual);
  if (!bytes.byteLength || bytes.byteLength > maxBytes)
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  return Object.freeze({ bytes, path: actual });
}
export async function loadVerifiedWebinarArt(
  templateValue: unknown,
  publicRoot = webinarPublicRoot(),
): Promise<Readonly<{ tall: Uint8Array; square: Uint8Array }>> {
  try {
    const template = WebinarTemplateEvidenceSchema.parse(templateValue);
    const entry = WEBINAR_ADS.find(
      (candidate) => candidate.id === template.id && candidate.version === template.version,
    );
    if (
      !entry ||
      canonicalCampaignHash(entry) !== template.sourceHash ||
      entry.goal !== template.goal ||
      entry.art.tall.sha256 !== template.tallSha256 ||
      entry.art.square.sha256 !== template.squareSha256
    )
      throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
    return await loadFrozenWebinarArt(template, publicRoot);
  } catch (error) {
    if (error instanceof WebinarAdRasterError) throw error;
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID", { cause: error });
  }
}
/** Historical access verifies frozen digests, without granting current preparation eligibility.
 * Retain versioned source files after registry withdrawal to preserve immutable audit evidence. */
export async function loadFrozenWebinarArt(
  templateValue: unknown,
  publicRoot = webinarPublicRoot(),
): Promise<Readonly<{ tall: Uint8Array; square: Uint8Array }>> {
  try {
    const template = WebinarTemplateEvidenceSchema.parse(templateValue);
    const load = async (shape: "tall" | "square") => {
      const file = await readContainedWebinarFile(
        publicRoot,
        ["webinar-ads", template.id, `v${template.version}`, `${shape}.png`],
        1024 * 1024,
      );
      await verifyWebinarPanel(
        file.bytes,
        shape === "tall" ? template.tallSha256 : template.squareSha256,
        shape === "tall" ? 1080 : 842,
      );
      return file.bytes;
    };
    const tall = await load("tall");
    const square = await load("square");
    return Object.freeze({ tall, square });
  } catch (error) {
    if (error instanceof WebinarAdRasterError) throw error;
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID", { cause: error });
  }
}
export function webinarTemplateEvidence(id: string, version: number): WebinarTemplateEvidence {
  const entry = WEBINAR_ADS.find(
    (candidate) => candidate.id === id && candidate.version === version,
  );
  if (!entry) throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  return WebinarTemplateEvidenceSchema.parse({
    id: entry.id,
    version: entry.version,
    goal: entry.goal,
    sourceHash: canonicalCampaignHash(entry),
    tallSha256: entry.art.tall.sha256,
    squareSha256: entry.art.square.sha256,
    rightsBasis: "platform-original",
  });
}
