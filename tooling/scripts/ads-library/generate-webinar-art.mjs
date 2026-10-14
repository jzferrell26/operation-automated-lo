import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

// Original typographic illustrations. No remote images, clock, person or lender identity.
// Re-running with the same installed fonts and sharp runtime produces the same PNG bytes.
const root = resolve(import.meta.dirname, "../../..");
const feature = join(root, "apps/web/src/features/webinar-ads");
const briefs = JSON.parse(await readFile(join(feature, "creative-briefs.json"), "utf8"));
const palettes = [
  { paper: "#eaf4ff", ink: "#061e35", accent: "#005fcc", soft: "#c7def7" },
  { paper: "#fff4d6", ink: "#33291b", accent: "#855900", soft: "#f1dca7" },
  { paper: "#eaf8f0", ink: "#123b2b", accent: "#137a50", soft: "#bce2ce" },
];
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
function motif(name, ink, soft) {
  const paths = {
    house:
      '<path d="M20 116 160 16 300 116M58 94v188h204V94M130 282V168h60v114M86 133h28v30H86m118-30h30v30h-30"/>',
    key: '<circle cx="92" cy="92" r="65"/><circle cx="92" cy="92" r="20"/><path d="m140 140 140 140m-48-48 38-38m-76 0 38-38"/>',
    chat: '<path d="M30 28h258v176H150l-68 60v-60H30Z"/><path d="M78 86h162M78 124h122M78 162h82"/>',
    checklist:
      '<rect x="40" y="20" width="240" height="280" rx="18"/><path d="m76 78 14 14 28-34m28 20h90m-160 72 14 14 28-34m28 20h90m-160 72 14 14 28-34m28 20h90"/>',
    folder:
      '<path d="M22 76h115l28 32h133v172H22ZM22 76V42h110l30 34"/><path d="M82 158h154M82 202h106"/>',
    compass:
      '<circle cx="160" cy="160" r="132"/><path d="m214 106-32 76-76 32 32-76Zm-54-78v28m0 208v28M28 160h28m208 0h28"/>',
    calendar:
      '<rect x="35" y="54" width="250" height="242" rx="18"/><path d="M35 120h250M100 20v68m120-68v68m-142 90h40m44 0h40m-124 52h40m44 0h40"/>',
  };
  return `<circle cx="160" cy="160" r="155" fill="${soft}"/><g fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
}
function artwork(brief, height) {
  const palette = palettes[brief.palette],
    tall = height === 1080;
  const titleY = tall ? 240 : 180,
    fontSize = brief.layout === "split" ? 64 : 74;
  const text = brief.lines
    .map(
      (line, index) =>
        `<text x="72" y="${titleY + index * 86}" font-size="${fontSize}" font-weight="700">${escape(line)}</text>`,
    )
    .join("");
  const picture = motif(brief.motif, palette.accent, palette.soft);
  const lower = tall ? 700 : 555;
  const decorations =
    brief.layout === "path"
      ? `<path d="M72 ${lower + 65}H310L420 ${lower - 20}H590" fill="none" stroke="${palette.accent}" stroke-width="9" stroke-dasharray="12 16"/><circle cx="72" cy="${lower + 65}" r="18" fill="${palette.accent}"/><g transform="translate(650 ${lower - 155}) scale(.9)">${picture}</g>`
      : brief.layout === "split"
        ? `<rect x="620" y="${titleY - 55}" width="388" height="${height - titleY - 85}" rx="190" fill="${palette.soft}"/><g transform="translate(656 ${lower - 185}) scale(.95)">${picture}</g><path d="M72 ${lower + 55}h310" stroke="${palette.accent}" stroke-width="12"/>`
        : `<g transform="translate(645 ${lower - 165}) scale(.95)">${picture}</g><rect x="72" y="${lower - 40}" width="450" height="8" fill="${palette.accent}"/><text x="72" y="${lower + 28}" font-size="27" font-weight="600">LEARN. ASK. PLAN.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="${palette.paper}"/><g fill="${palette.ink}" font-family="Arial, sans-serif"><rect x="72" y="60" width="${brief.layout === "split" ? 490 : 650}" height="50" rx="25" fill="${palette.ink}"/><text x="96" y="94" fill="white" font-size="23" font-weight="700" letter-spacing="2">FIRST-TIME HOMEBUYER WEBINAR</text>${text}${decorations}<text x="72" y="${height - 62}" font-size="20" font-weight="600" letter-spacing="1">${escape(brief.caption)}</text></g></svg>`;
}
const catalog = [];
for (const brief of briefs) {
  if (!/^webinar-[a-z]+(?:-[a-z]+)*$/u.test(brief.id)) throw new Error("Invalid creative id");
  const art = {};
  for (const [shape, height] of [
    ["tall", 1080],
    ["square", 842],
  ]) {
    const file = join(root, "apps/web/public/webinar-ads", brief.id, "v1", `${shape}.png`);
    const bytes = await sharp(Buffer.from(artwork(brief, height)))
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    if (bytes.length > 1048576) throw new Error("Creative exceeds art budget");
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, bytes);
    art[shape] = {
      path: `/webinar-ads/${brief.id}/v1/${shape}.png`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }
  catalog.push({
    id: brief.id,
    version: 1,
    status: "pending-review",
    name: brief.name,
    goal: brief.goal,
    learningConnection: brief.learningConnection,
    headline: brief.headline,
    primaryText: brief.primaryText,
    art: {
      ...art,
      alt: `${brief.lines.join(" ")} First-time homebuyer webinar, with an original ${brief.motif} illustration.`,
    },
  });
}
await writeFile(join(feature, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
process.stdout.write(
  `Prepared ${catalog.length} original webinar creatives and ${catalog.length * 2} raster assets.\n`,
);
