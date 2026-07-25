#!/usr/bin/env node
/*
 * PHOTO CROP SPEC TEMPLATE - fill in per client, then `node photo-crop-spec.template.mjs`.
 * Crops source photos to 1080x1080 squares (cover) via sharp. Read
 * guides/04-photos-sharp.md before filling this in.
 *
 * RULES (do not remove):
 * - Re-encoding strips EXIF/GPS (privacy). Keep raw sources OUT of git; commit
 *   only the processed squares in OUT.
 * - .rotate() FIRST to auto-orient from EXIF, then crop, so phone photos are
 *   not sideways.
 * - MANUAL path: set cx/cy when you know the subject position. AUTO path:
 *   position: sharp.strategy.attention when you cannot hand-tune. No em dashes.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "images", "source"); // raw photos (gitignored)
const OUT = join(here, "images", "photos");
mkdirSync(OUT, { recursive: true });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// MANUAL jobs: cx/cy = subject center as a fraction (only matters off-center).
const JOBS = [
  { out: "photo-01.png", src: "______.jpg", cx: 0.5, cy: 0.45 },
  // { out: "photo-02.png", src: "______.jpg", cx: 0.72 }, // subject on the right
];

for (const job of JOBS) {
  const src = join(SRC, job.src);
  const m = await sharp(src).rotate().metadata(); // rotate() applied below too
  const side = Math.min(m.width, m.height);
  const left = clamp(Math.round(job.cx * m.width - side / 2), 0, m.width - side);
  const top = clamp(Math.round((job.cy ?? 0.45) * m.height - side / 2), 0, m.height - side);
  await sharp(src)
    .rotate()
    .extract({ left, top, width: side, height: side })
    .resize(1080, 1080, { fit: "cover" })
    .png({ quality: 90 })
    .toFile(join(OUT, job.out));
  console.log(`  ${job.out}  <- ${job.src}  (${m.width}x${m.height} -> 1080x1080)`);
}

// AUTO path (uncomment for bulk crops you cannot hand-tune):
// await sharp(src).rotate()
//   .resize(1080, 1080, { fit: "cover", position: sharp.strategy.attention })
//   .png().toFile(out);

console.log(`Wrote ${JOBS.length} photo squares to ${OUT}`);
