import { copyFile, mkdir, readdir } from "node:fs/promises";

const sourceDirectory = new URL("../src/", import.meta.url);
const sourceComponentsDirectory = new URL("components/", sourceDirectory);
const outputDirectory = new URL("../dist/", import.meta.url);
const outputComponentsDirectory = new URL("components/", outputDirectory);

await mkdir(outputComponentsDirectory, { recursive: true });
await copyFile(new URL("tokens.css", sourceDirectory), new URL("tokens.css", outputDirectory));
await copyFile(
  new URL("product-tokens.css", sourceDirectory),
  new URL("product-tokens.css", outputDirectory),
);

const componentEntries = await readdir(sourceComponentsDirectory, { withFileTypes: true });
const componentStylesheets = componentEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
  .map((entry) => entry.name)
  .sort();

for (const stylesheet of componentStylesheets) {
  await copyFile(
    new URL(stylesheet, sourceComponentsDirectory),
    new URL(stylesheet, outputComponentsDirectory),
  );
}

await copyFile(
  new URL("primitives.css", sourceComponentsDirectory),
  new URL("components.css", outputDirectory),
);
