import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009a, 009A-AC-006. The interface font is the upstream Inter variable file, vendored
 * unmodified beside its licence, and the record in `apps/web/public/fonts/README.md` is what proves
 * it. This test recomputes each vendored file's identity from its bytes and holds it to that
 * record, so a re-encoded, subset, or swapped file fails here before it ships.
 *
 * Two identities per file, because they answer two different questions:
 *
 * - the git blob SHA-1 (SHA-1 over `blob <byte length>`, a zero byte, then the bytes) is the value
 *   `gh api 'repos/rsms/inter/contents/<path>?ref=<tag>'` reports, so it ties the file to the
 *   upstream tree at the release tag without trusting a release archive (whose digest the release
 *   API reports as `null`);
 * - the SHA-256 is the conventional content digest anyone can recompute with a stock tool.
 */

const FONT_DIRECTORY = "apps/web/public/fonts";
const README = readFileSync(resolve(FONT_DIRECTORY, "README.md"), "utf8");

type RecordedFile = Readonly<{
  file: string;
  upstreamPath: string;
  bytes: number;
  gitBlobSha1: string;
  sha256: string;
}>;

/** Rows of the README's "Vendored files" table: `| file | path | bytes | blob sha-1 | sha-256 |`. */
function recordedFiles(): readonly RecordedFile[] {
  const rows = [
    ...README.matchAll(
      /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*([\d,]+)\s*\|\s*`([0-9a-f]{40})`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*$/gmu,
    ),
  ];
  return rows.map(([, file, upstreamPath, bytes, gitBlobSha1, sha256]) => ({
    file: file ?? "",
    upstreamPath: upstreamPath ?? "",
    bytes: Number((bytes ?? "").replaceAll(",", "")),
    gitBlobSha1: gitBlobSha1 ?? "",
    sha256: sha256 ?? "",
  }));
}

function gitBlobSha1(bytes: Buffer): string {
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${String(bytes.length)}\0`, "utf8"), bytes]))
    .digest("hex");
}

describe("the vendored Inter font and its licence (009A-AC-006)", () => {
  it("records exactly the two upstream files, at the release tag and its commit", () => {
    expect(recordedFiles().map((row) => [row.file, row.upstreamPath])).toEqual([
      ["InterVariable.woff2", "docs/font-files/InterVariable.woff2"],
      ["LICENSE.txt", "LICENSE.txt"],
    ]);
    expect(README).toMatch(/^Release tag: `v4\.1`$/mu);
    expect(README).toMatch(/^Tag commit: `e3a3d4c57d5ecc01453a575621882a384c1995a3`$/mu);
    expect(README).toMatch(/^Downloaded: 2026-10-01$/mu);
  });

  it("matches every recorded byte size, git blob SHA-1, and SHA-256 to the bytes on disk", () => {
    for (const row of recordedFiles()) {
      const bytes = readFileSync(resolve(FONT_DIRECTORY, row.file));
      expect(bytes.length, `${row.file} byte size`).toBe(row.bytes);
      expect(gitBlobSha1(bytes), `${row.file} git blob SHA-1`).toBe(row.gitBlobSha1);
      expect(createHash("sha256").update(bytes).digest("hex"), `${row.file} SHA-256`).toBe(
        row.sha256,
      );
    }
  });

  it("pins the upstream identities the PRD read on 2026-10-01", () => {
    const byFile = new Map(recordedFiles().map((row) => [row.file, row]));
    expect(byFile.get("InterVariable.woff2")).toMatchObject({
      bytes: 352_240,
      gitBlobSha1: "5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212",
    });
    expect(byFile.get("LICENSE.txt")).toMatchObject({
      bytes: 4_380,
      gitBlobSha1: "9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea",
    });
  });

  it("ships the SIL Open Font License 1.1 from The Inter Project Authors", () => {
    const licence = readFileSync(resolve(FONT_DIRECTORY, "LICENSE.txt"), "utf8");
    expect(licence).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(licence).toContain("Copyright (c) 2016 The Inter Project Authors");
  });

  it("states that no archive digest is relied on and that the Geist ruling is superseded", () => {
    expect(README).toContain("`digest: null`");
    expect(README).toMatch(/Geist ruling[^.]*superseded on 2026-10-01/iu);
  });
});
