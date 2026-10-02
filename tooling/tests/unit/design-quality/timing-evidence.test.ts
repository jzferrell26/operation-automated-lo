import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TIMING_SECTION_HEADING,
  printTimingBlock,
  renderTimingSection,
  writeTimingEvidence,
} from "../../../../tests/browser/review/helpers/guided-setup-journey.js";

/**
 * PRD-009g, 009G-AC-008. The timed run's numbers reach `guided-setup-timing.md` in two ways: printed
 * to the run's log in a labelled block, which is how they get out of continuous integration, and
 * written to the file under the regenerate flag. The file holds two measurements, and the earlier
 * one is what `CRR-162` cites, so the writer may replace only its own section and nothing above it.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const COMMITTED = join(repositoryRoot, "docs/operations/evidence-packs/guided-setup-timing.md");

const EVIDENCE = Object.freeze({
  budgets: { "0. Create your account": 30, "1. Home": 10 },
  ceilingSeconds: 300,
  commit: "abc1234",
  timings: [
    { step: "0. Create your account", seconds: 23.4 },
    { step: "1. Home", seconds: 12.5 },
    { step: "2. A step with no budget", seconds: 3 },
  ],
  totalSeconds: 38.9,
});

const directories: string[] = [];

function temporaryFile(content?: string): string {
  const directory = mkdtempSync(join(tmpdir(), "oalo-timing-"));
  directories.push(directory);
  const file = join(directory, "docs", "guided-setup-timing.md");
  if (content !== undefined) {
    writeFileSync(file, content, { flag: "w" });
  }
  return file;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0))
    rmSync(directory, { force: true, recursive: true });
});

describe("the launch-an-ad timing evidence (009G-AC-008)", () => {
  it("renders the section as a table with a verdict per step and the total against the ceiling", () => {
    const section = renderTimingSection(EVIDENCE);

    expect(section.startsWith(TIMING_SECTION_HEADING)).toBe(true);
    expect(section).toContain("| 0. Create your account | 23.4 | 30 | within |");
    expect(section).toContain("| 1. Home | 12.5 | 10 | over |");
    expect(section).toContain("| 2. A step with no budget | 3.0 | n/a | no budget |");
    expect(section).toContain("| **Total** | **38.9** | **300** | **within** |");
    expect(section).toContain("Measured against commit: abc1234");
    expect(section).toContain("tests/browser/review/launch-an-ad.timed.spec.ts");
  });

  it("prints the same section between two lines that say what it is and where it goes", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    printTimingBlock(EVIDENCE);

    expect(log).toHaveBeenCalledTimes(1);
    const printed = String(log.mock.calls[0]?.[0]);
    const lines = printed.split("\n");
    expect(lines[0]).toMatch(
      /^=+ LAUNCH AN AD TIMING \(009G-AC-008\): copy into docs\/operations\//u,
    );
    expect(lines.at(-1)).toMatch(/^=+ END LAUNCH AN AD TIMING: total 38\.9 s against 300 s =+$/u);
    expect(printed).toContain(renderTimingSection(EVIDENCE));
  });

  it("replaces only its own section, and keeps the walkthrough's table above it byte for byte", () => {
    const committed = readFileSync(COMMITTED, "utf8");
    const above = committed.slice(0, committed.indexOf(TIMING_SECTION_HEADING));
    expect(committed, "the committed file has the section to replace").toContain(
      TIMING_SECTION_HEADING,
    );
    expect(above).toContain("## PRD-006c, retired (2026-10-01)");
    expect(above).toContain("| **Total** | **78.0** | **300** | **within** |");

    const file = temporaryFile();
    // The directory exists only once the writer makes it, so the file starts from the committed text.
    writeTimingEvidence(EVIDENCE, file);
    writeFileSync(file, committed);
    writeTimingEvidence(EVIDENCE, file);
    const written = readFileSync(file, "utf8");

    expect(written.startsWith(above)).toBe(true);
    expect(written.endsWith(renderTimingSection(EVIDENCE))).toBe(true);
  });

  it("replaces on a second run instead of appending, and appends once to a file with no section", () => {
    const file = temporaryFile();
    writeTimingEvidence(EVIDENCE, file);
    const first = readFileSync(file, "utf8");
    writeTimingEvidence({ ...EVIDENCE, totalSeconds: 41.2 }, file);
    const second = readFileSync(file, "utf8");

    expect(first.split(TIMING_SECTION_HEADING)).toHaveLength(2);
    expect(second.split(TIMING_SECTION_HEADING)).toHaveLength(2);
    expect(second).toContain("Measured total: 41.2 s");
    expect(second).not.toContain("Measured total: 38.9 s");

    const withHistory = temporaryFile();
    writeTimingEvidence(EVIDENCE, withHistory);
    writeFileSync(withHistory, "# Guided setup timing\n\nThe earlier table.\n");
    writeTimingEvidence(EVIDENCE, withHistory);
    const appended = readFileSync(withHistory, "utf8");
    expect(appended.startsWith("# Guided setup timing\n\nThe earlier table.\n\n")).toBe(true);
    expect(appended.split(TIMING_SECTION_HEADING)).toHaveLength(2);
  });
});
