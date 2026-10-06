import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");
describe("funnel-photo serverless import boundary", () => {
  it("exports only the raster utility through its dedicated package entry", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "packages/rendering/package.json"), "utf8"));
    expect(pkg.exports["./funnel-photo"]).toEqual({
      types: "./src/funnel-photo.ts",
      default: "./dist/funnel-photo.js",
    });
    const code = readFileSync(resolve(root, "packages/rendering/src/funnel-photo.ts"), "utf8");
    expect(code).not.toMatch(/playwright|production-rendering|render-evidence|from ["']\.\/index/u);
  });
  it("never imports the browser-rendering barrel into a funnel request or page module", () => {
    const folder = resolve(root, "apps/web/src/server");
    for (const file of readdirSync(folder).filter((file) => /^funnel-[a-z-]+\.ts$/u.test(file))) {
      expect(readFileSync(resolve(folder, file), "utf8"), file).not.toMatch(
        /from ["']@oalo\/rendering["']/u,
      );
    }
    expect(readFileSync(resolve(folder, "funnel-http.ts"), "utf8")).toContain(
      'from "@oalo/rendering/funnel-photo"',
    );
  });
});
