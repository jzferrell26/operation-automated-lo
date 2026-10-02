import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import sharp from "sharp";

import { appendLockLines, formatJson } from "./catalog-lock.mjs";

/**
 * PRD-009c D2, 009C-AC-003. Generates the sample ads: their art, the sample catalog, and its lock.
 *
 * Every pixel is computed here in plain JavaScript (rectangles, triangles, circles, and a 5 by 7
 * block font) and only the PNG encoding is left to the `sharp` the repository already declares, with
 * fixed settings. No font, no SVG text, and no clock is read, so two runs on one machine write
 * byte-identical files. sharp writes no EXIF, XMP, or text chunk unless asked to, and nothing here
 * asks.
 *
 * Every image carries a large SAMPLE mark. No person or company appears in the pictures or the
 * words; the repository's synthetic identity (Alex Morgan, Prairie Home Lending, NMLS 0000000) is
 * what the brand band adds on top, from Brand, never what the art says.
 *
 *   node tooling/scripts/ads-library/generate-sample-art.mjs
 */

const SIZES = Object.freeze({
  tall: Object.freeze({ width: 1_080, height: 1_080 }),
  square: Object.freeze({ width: 1_080, height: 842 }),
});

const SAMPLE_APPROVAL = "Sample catalog, not a real approval";

/** The colour of the SAMPLE letters, exported so a test can find them in the pixels. */
export const SAMPLE_MARK_INK = Object.freeze([17, 32, 64]);
const PLATE = [255, 255, 255];
const PLATE_EDGE = [17, 32, 64];
const HOUSE = [255, 255, 255];
const ROOF = [17, 32, 64];
const DETAIL = [47, 111, 237];

const TOPIC_BACKGROUND = Object.freeze({
  "first-time-buyers": [226, 236, 252],
  refinance: [228, 244, 236],
  "va-loans": [236, 232, 250],
  "pre-approval": [252, 240, 222],
  "down-payment-help": [250, 230, 234],
});

const GLYPHS = Object.freeze({
  S: [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
});
const MARK = "SAMPLE";
const GLYPH_SCALE = 24;
const GLYPH_GAP = 24;
const MARK_TOP = 190;

const COMPLIANCE_NOTES =
  "Sample ad for tests and the demo only. No rates, payments or loan terms in the words.";
const BLOCKED_IN_WORDS = [
  "rate-claims",
  "payment-claims",
  "term-claims",
  "guarantees",
  "realtor-or-brokerage-names",
];

/**
 * The sample ads. Eight are active and cover the five topics; one older version is replaced by a
 * newer one, and one ad is retired, so every library state can be shown and tested.
 */
export const SAMPLE_ADS = Object.freeze([
  {
    id: "sample-first-home",
    version: 1,
    status: "replaced",
    topic: "first-time-buyers",
    accent: "key",
    name: "Sample: First home, start here",
    alt: "A drawing of a house and a key under a large SAMPLE mark",
    headline: "Buying your first home? Start with a plan.",
    primaryText:
      "I help first-time buyers understand each step, from pre-approval to closing day. Send me a message and let's talk about where you are today.",
    approvedOn: "2026-09-01",
  },
  {
    id: "sample-first-home",
    version: 2,
    status: "active",
    topic: "first-time-buyers",
    accent: "key",
    name: "Sample: First home, start here",
    alt: "A drawing of a house and a key under a large SAMPLE mark",
    headline: "Thinking about your first home? Start here.",
    primaryText:
      "I walk first-time buyers through each step, from pre-approval to closing day. Send me a message and let's talk about your plans.",
    approvedOn: "2026-09-28",
  },
  {
    id: "sample-first-home-checklist",
    version: 1,
    status: "active",
    topic: "first-time-buyers",
    accent: "check",
    name: "Sample: Your first home checklist",
    alt: "A drawing of a house and a check mark under a large SAMPLE mark",
    headline: "Your first home checklist starts with one call.",
    primaryText:
      "Not sure what comes first when you buy a home? I can walk you through the steps in plain words. Send me a message to get started.",
    approvedOn: "2026-09-12",
  },
  {
    id: "sample-loan-review",
    version: 1,
    status: "active",
    topic: "refinance",
    accent: "ring",
    name: "Sample: Is your home loan still a fit?",
    alt: "A drawing of a house and a circle under a large SAMPLE mark",
    headline: "Wondering if your home loan still fits?",
    primaryText:
      "Life changes, and your home loan can change with it. Send me a message and we can look at your options together.",
    approvedOn: "2026-09-20",
  },
  {
    id: "sample-refinance-questions",
    version: 1,
    status: "active",
    topic: "refinance",
    accent: "ring",
    name: "Sample: Questions to ask before you refinance",
    alt: "A drawing of a house and a circle beside it under a large SAMPLE mark",
    headline: "Thinking about a refinance? Ask first.",
    primaryText:
      "Before you refinance, it helps to know the right questions. Send me a message and I'll walk you through them.",
    approvedOn: "2026-09-14",
  },
  {
    id: "sample-va-home-loans",
    version: 1,
    status: "active",
    topic: "va-loans",
    accent: "flag",
    name: "Sample: Home loans for veterans",
    alt: "A drawing of a house and a flag under a large SAMPLE mark",
    headline: "Served our country? Let's talk home loans.",
    primaryText:
      "VA loans can help eligible veterans and service members buy a home. Send me a message to learn whether you may qualify.",
    approvedOn: "2026-09-18",
  },
  {
    id: "sample-pre-approval",
    version: 1,
    status: "active",
    topic: "pre-approval",
    accent: "check",
    name: "Sample: Get pre-approved before you shop",
    alt: "A drawing of a house and a check mark beside it under a large SAMPLE mark",
    headline: "Get pre-approved before you start shopping.",
    primaryText:
      "A pre-approval helps you know where you stand before you make an offer. Send me a message and let's get started.",
    approvedOn: "2026-09-24",
  },
  {
    id: "sample-stronger-offer",
    version: 1,
    status: "active",
    topic: "pre-approval",
    accent: "key",
    name: "Sample: Make a stronger offer",
    alt: "A drawing of a house and a key beside it under a large SAMPLE mark",
    headline: "Ready to make an offer? Start with a pre-approval.",
    primaryText:
      "Sellers take a pre-approved buyer seriously. Send me a message and I'll explain how the process works.",
    approvedOn: "2026-09-10",
  },
  {
    id: "sample-down-payment-help",
    version: 1,
    status: "active",
    topic: "down-payment-help",
    accent: "stack",
    name: "Sample: Down payment help may be closer",
    alt: "A drawing of a house and a stack of coins under a large SAMPLE mark",
    headline: "Down payment help may be closer than you think.",
    primaryText:
      "Many buyers don't know about down payment help programs. Send me a message and I'll walk you through what may be available.",
    approvedOn: "2026-09-26",
  },
  {
    id: "sample-spring-search",
    version: 1,
    status: "retired",
    topic: "first-time-buyers",
    accent: "flag",
    name: "Sample: Spring home search",
    alt: "A drawing of a house and a small flag under a large SAMPLE mark",
    headline: "Spring is a great time to start your home search.",
    primaryText:
      "Thinking about buying this spring? Send me a message and let's talk about your plans.",
    approvedOn: "2026-09-05",
    retired: {
      on: "2026-09-30",
      reason: "A seasonal sample, taken out of the library.",
      replacedBy: "sample-first-home",
    },
  },
]);

class Canvas {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.rect(0, 0, width, height, background);
  }

  set(x, y, colour) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    this.pixels[offset] = colour[0];
    this.pixels[offset + 1] = colour[1];
    this.pixels[offset + 2] = colour[2];
  }

  rect(left, top, width, height, colour) {
    for (let y = Math.round(top); y < Math.round(top + height); y += 1) {
      for (let x = Math.round(left); x < Math.round(left + width); x += 1) this.set(x, y, colour);
    }
  }

  /** Fills the pixels whose centre lies inside the triangle, by the sign of three edge functions. */
  triangle(a, b, c, colour) {
    const edge = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    const area = edge(a, b, c[0], c[1]);
    const minX = Math.floor(Math.min(a[0], b[0], c[0]));
    const maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
    const minY = Math.floor(Math.min(a[1], b[1], c[1]));
    const maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = edge(b, c, px, py) * area;
        const w1 = edge(c, a, px, py) * area;
        const w2 = edge(a, b, px, py) * area;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.set(x, y, colour);
      }
    }
  }

  circle(centreX, centreY, radius, colour, innerRadius = 0) {
    for (let y = Math.floor(centreY - radius); y <= Math.ceil(centreY + radius); y += 1) {
      for (let x = Math.floor(centreX - radius); x <= Math.ceil(centreX + radius); x += 1) {
        const distance = Math.hypot(x + 0.5 - centreX, y + 0.5 - centreY);
        if (distance <= radius && distance >= innerRadius) this.set(x, y, colour);
      }
    }
  }

  /** A line of the given half-width, drawn as every pixel within that distance of the segment. */
  line(from, to, halfWidth, colour) {
    const [x1, y1] = from;
    const [x2, y2] = to;
    const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    for (
      let y = Math.floor(Math.min(y1, y2) - halfWidth);
      y <= Math.ceil(Math.max(y1, y2) + halfWidth);
      y += 1
    ) {
      for (
        let x = Math.floor(Math.min(x1, x2) - halfWidth);
        x <= Math.ceil(Math.max(x1, x2) + halfWidth);
        x += 1
      ) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(
          0,
          Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lengthSquared),
        );
        if (Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1))) <= halfWidth) {
          this.set(x, y, colour);
        }
      }
    }
  }
}

function markWidth() {
  return MARK.length * 5 * GLYPH_SCALE + (MARK.length - 1) * GLYPH_GAP;
}

function markLeft(width) {
  return Math.round((width - markWidth()) / 2);
}

/** Every inked cell of the SAMPLE mark, as the top-left pixel of the cell. */
function markCells(width) {
  const cells = [];
  let left = markLeft(width);
  for (const letter of MARK) {
    GLYPHS[letter].forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell === "#") {
          cells.push([left + columnIndex * GLYPH_SCALE, MARK_TOP + rowIndex * GLYPH_SCALE]);
        }
      });
    });
    left += 5 * GLYPH_SCALE + GLYPH_GAP;
  }
  return cells;
}

/** Pixels a test can read to prove the mark is in the art: the centre of each letter's first cell. */
export function sampleMarkProbes(shape) {
  const { width } = SIZES[shape];
  const half = Math.floor(GLYPH_SCALE / 2);
  const probes = [];
  let left = markLeft(width);
  for (const letter of MARK) {
    const rowIndex = GLYPHS[letter].findIndex((row) => row.includes("#"));
    const columnIndex = GLYPHS[letter][rowIndex].indexOf("#");
    probes.push([
      left + columnIndex * GLYPH_SCALE + half,
      MARK_TOP + rowIndex * GLYPH_SCALE + half,
    ]);
    left += 5 * GLYPH_SCALE + GLYPH_GAP;
  }
  return probes;
}

function drawMark(canvas) {
  const plateLeft = markLeft(canvas.width) - 60;
  const plateTop = MARK_TOP - 50;
  const plateWidth = markWidth() + 120;
  const plateHeight = 7 * GLYPH_SCALE + 100;
  canvas.rect(plateLeft - 8, plateTop - 8, plateWidth + 16, plateHeight + 16, PLATE_EDGE);
  canvas.rect(plateLeft, plateTop, plateWidth, plateHeight, PLATE);
  for (const [x, y] of markCells(canvas.width)) {
    canvas.rect(x, y, GLYPH_SCALE, GLYPH_SCALE, SAMPLE_MARK_INK);
  }
}

function drawHouse(canvas, top, scale) {
  const centre = 470;
  const bodyTop = top + 150 * scale;
  const bodyHeight = 300 * scale;
  canvas.triangle([centre, top], [centre - 250, bodyTop], [centre + 250, bodyTop], ROOF);
  canvas.rect(centre - 200, bodyTop, 400, bodyHeight, HOUSE);
  canvas.rect(centre - 40, bodyTop + bodyHeight - 170 * scale, 80, 170 * scale, DETAIL);
  canvas.rect(centre - 160, bodyTop + 50 * scale, 80, 80 * scale, DETAIL);
  canvas.rect(centre + 80, bodyTop + 50 * scale, 80, 80 * scale, DETAIL);
}

function drawAccent(canvas, accent, top, scale) {
  const x = 860;
  const y = top + 270 * scale;
  if (accent === "key") {
    canvas.circle(x - 60, y, 60 * scale, ROOF, 28 * scale);
    canvas.rect(x - 4, y - 14 * scale, 150, 28 * scale, ROOF);
    canvas.rect(x + 100, y + 14 * scale, 22, 40 * scale, ROOF);
  } else if (accent === "check") {
    canvas.line([x - 90, y], [x - 30, y + 70 * scale], 22, DETAIL);
    canvas.line([x - 30, y + 70 * scale], [x + 100, y - 90 * scale], 22, DETAIL);
  } else if (accent === "ring") {
    canvas.circle(x, y, 110 * scale, DETAIL, 70 * scale);
    canvas.triangle(
      [x + 80, y - 40 * scale],
      [x + 150, y - 40 * scale],
      [x + 115, y + 10 * scale],
      DETAIL,
    );
  } else if (accent === "flag") {
    canvas.rect(x - 90, y - 150 * scale, 18, 300 * scale, ROOF);
    canvas.rect(x - 72, y - 150 * scale, 170, 110 * scale, DETAIL);
    canvas.rect(x - 72, y - 115 * scale, 170, 20 * scale, HOUSE);
  } else {
    for (let index = 0; index < 4; index += 1) {
      canvas.rect(
        x - 90,
        y + (80 - index * 50) * scale,
        180,
        40 * scale,
        index % 2 === 0 ? DETAIL : ROOF,
      );
    }
  }
}

function pixelsFor(spec, shape) {
  const { width, height } = SIZES[shape];
  const canvas = new Canvas(width, height, TOPIC_BACKGROUND[spec.topic]);
  const scale = height / SIZES.tall.height;
  const pictureTop = Math.round(Math.max(height * 0.47, 440));
  drawHouse(canvas, pictureTop, scale);
  drawAccent(canvas, spec.accent, pictureTop, scale);
  drawMark(canvas);
  return canvas;
}

export async function renderSampleArt(spec, shape) {
  const canvas = pixelsFor(spec, shape);
  return sharp(canvas.pixels, { raw: { width: canvas.width, height: canvas.height, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

function artName(spec, shape) {
  return `${spec.id}/v${String(spec.version)}/${shape}.png`;
}

function catalogEntry(spec, digests) {
  return {
    id: spec.id,
    version: spec.version,
    status: spec.status,
    sample: true,
    topic: spec.topic,
    name: spec.name,
    images: {
      tall: { art: artName(spec, "tall"), sha256: digests.tall },
      square: { art: artName(spec, "square"), sha256: digests.square },
      alt: spec.alt,
    },
    defaults: { headline: spec.headline, primaryText: spec.primaryText },
    editable: { headline: { maxLength: 60 }, primaryText: { maxLength: 300 } },
    callToAction: "LEARN_MORE",
    specialAdCategory: "HOUSING",
    compliance: {
      notes: COMPLIANCE_NOTES,
      requiredOnAd: ["nmls", "equal-housing"],
      blockedInWords: BLOCKED_IN_WORDS,
    },
    approval: { approvedBy: SAMPLE_APPROVAL, approvedOn: spec.approvedOn },
    ...(spec.retired === undefined ? {} : { retired: spec.retired }),
  };
}

async function existingLock(lockFile) {
  try {
    return JSON.parse(await readFile(lockFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Writes every sample's art, then the catalog, and appends to its lock. A locked sample whose bytes,
 * words, or limits would change makes the run fail: like a real ad, a changed sample is a new version.
 */
export async function generateSampleAds({ artRoot, catalogFile, lockFile }) {
  const entries = [];
  for (const spec of SAMPLE_ADS) {
    const digests = {};
    for (const shape of ["tall", "square"]) {
      const bytes = await renderSampleArt(spec, shape);
      const path = join(artRoot, artName(spec, shape));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
      digests[shape] = createHash("sha256").update(bytes).digest("hex");
    }
    entries.push(catalogEntry(spec, digests));
  }
  await mkdir(dirname(catalogFile), { recursive: true });
  await writeFile(catalogFile, await formatJson(entries, catalogFile), "utf8");
  const lock = appendLockLines(await existingLock(lockFile), entries);
  await writeFile(lockFile, await formatJson(lock, lockFile), "utf8");
  return entries;
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  const fixtures = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../apps/web/src/fixtures/ads-library",
  );
  const entries = await generateSampleAds({
    artRoot: join(fixtures, "art"),
    catalogFile: join(fixtures, "sample-catalog.json"),
    lockFile: join(fixtures, "sample-catalog.lock.json"),
  });
  process.stdout.write(`${String(entries.length)} sample entries written.\n`);
}
