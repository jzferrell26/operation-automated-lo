import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("financing additions preserve the public and storage boundaries", () => {
  it.each([
    "financing-save.ts",
    "financing-http.ts",
    "financing-output.ts",
    "financing-html.ts",
    "financing-pdf.ts",
    "financing-context.ts",
  ])(
    "%s contains no live fetch, raw SQL, executable user markup or browser token",
    async (file) => {
      const source = await readFile(resolve(import.meta.dirname, file), "utf8");
      expect(source).not.toMatch(
        /\bfetch\s*\(|dangerouslySetInnerHTML|\beval\s*\(|localStorage|NEXT_PUBLIC_/u,
      );
      expect(source).not.toMatch(/\b(?:insert into|update campaign\.|set (?:local )?role)\b/iu);
    },
  );
});
