import { createHash } from "node:crypto";

import { canonicalCampaignHash } from "./canonical-hash.js";

/**
 * PRD-009c D5. The references a library-ad version and its approval snapshot carry. Each one is
 * derived from content, never minted per draft, so the same ad, art, words, or disclosure line
 * always yields the same reference, and a change to any of them yields a different one.
 *
 * The image and creative references hash a colon-joined string: every part is a kebab id, a
 * positive integer, a fixed shape word, or 64 hexadecimal characters, so no part can contain the
 * separator. The copy and disclosure references hash canonical JSON instead, because free text can
 * contain any separator.
 */

const REFERENCE_DIGEST_LENGTH = 40;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function libraryAdImageRef(
  id: string,
  version: number,
  shape: "tall" | "square",
  contentSha256: string,
): string {
  const digest = sha256Hex(`${id}:${String(version)}:${shape}:${contentSha256}`);
  return `libimg_${digest.slice(0, REFERENCE_DIGEST_LENGTH)}`;
}

export function libraryAdCreativeRef(
  id: string,
  version: number,
  tallSha256: string,
  squareSha256: string,
): string {
  const digest = sha256Hex(`${id}:${String(version)}:${tallSha256}:${squareSha256}`);
  return `libcreative_${digest.slice(0, REFERENCE_DIGEST_LENGTH)}`;
}

export function libraryAdCopyRef(headline: string, primaryText: string): string {
  const digest = canonicalCampaignHash({ headline, primaryText });
  return `libcopy_${digest.slice(0, REFERENCE_DIGEST_LENGTH)}`;
}

export function libraryAdDisclosureRef(disclosure: string): string {
  const digest = canonicalCampaignHash({ disclosure });
  return `libdisclosure_${digest.slice(0, REFERENCE_DIGEST_LENGTH)}`;
}
