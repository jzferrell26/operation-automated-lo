import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * PRD-009c D2 and D3, 009C-AC-004. Scans a production build for any trace of the sample ads.
 *
 * The sample catalog is never imported and its paths are hidden from the build's file tracer, so a
 * deployment's build holds neither its entries nor its art. This scan proves it: every sample id
 * and every sample name is searched for in the build's text files, and every file is compared by
 * SHA-256 with every sample art digest, so a copy under any name is found.
 *
 *   node tooling/scripts/ads-library/scan-build-output.mjs apps/web/.next
 *
 * Exits 1 and lists each trace when it finds one.
 */

const TEXT_EXTENSIONS = /\.(?:js|mjs|cjs|json|html|rsc|txt|map|css|body|meta|nft\.json)$/iu;
const DEFAULT_SAMPLE_CATALOG = "apps/web/src/fixtures/ads-library/sample-catalog.json";

async function filesUnder(directory) {
  const found = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) found.push(...(await filesUnder(path)));
    else if (item.isFile()) found.push(path);
  }
  return found;
}

/**
 * Every sample id and name. The sample approval literal and the catalog's file name are not
 * markers: the first is a constant of the catalog schema in `@oalo/contracts`, and the second is a
 * path segment in the loader's code, so both are in every build by design and neither is an entry.
 */
function textMarkers(catalog) {
  const markers = new Set();
  for (const entry of catalog) {
    markers.add(entry.id);
    markers.add(entry.name);
  }
  return [...markers];
}

function artDigests(catalog) {
  const digests = new Set();
  for (const entry of catalog) {
    digests.add(entry.images.tall.sha256);
    digests.add(entry.images.square.sha256);
  }
  return digests;
}

/** Every trace of a sample in the build directory, as `{ file, marker }`, file relative to it. */
export async function findSampleTraces(buildDirectory, sampleCatalogFile = DEFAULT_SAMPLE_CATALOG) {
  const catalog = JSON.parse(await readFile(sampleCatalogFile, "utf8"));
  const markers = textMarkers(catalog);
  const digests = artDigests(catalog);
  const traces = [];
  for (const path of (await filesUnder(buildDirectory)).sort()) {
    const file = relative(buildDirectory, path).replaceAll("\\", "/");
    const bytes = await readFile(path);
    if (digests.has(createHash("sha256").update(bytes).digest("hex"))) {
      traces.push({ file, marker: "sample art bytes" });
      continue;
    }
    if (!TEXT_EXTENSIONS.test(path) && !/^[^.]+$/u.test(file.split("/").pop() ?? "")) continue;
    const text = bytes.toString("utf8");
    const marker = markers.find((candidate) => text.includes(candidate));
    if (marker !== undefined) traces.push({ file, marker });
  }
  return traces;
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  const buildDirectory = process.argv[2];
  if (buildDirectory === undefined) {
    throw new Error("Usage: scan-build-output.mjs <build directory> [sample catalog]");
  }
  const traces = await findSampleTraces(buildDirectory, process.argv[3]);
  if (traces.length > 0) {
    for (const trace of traces) process.stderr.write(`${trace.file}: ${trace.marker}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`No sample ad trace in ${buildDirectory}.\n`);
  }
}
