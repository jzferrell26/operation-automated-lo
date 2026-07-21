import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const script = "tooling/scripts/release/validate-migration-compatibility.mjs";
const fixture = "tooling/tests/fixtures/release/migration-compatibility";

describe("migration compatibility release validation", () => {
  it("validates synthetic expand compatibility for prior web and task manifests", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      script,
      "--prior-web-manifest",
      `${fixture}/prior-web.json`,
      "--prior-tasks-manifest",
      `${fixture}/prior-tasks.json`,
      "--candidate-web-manifest",
      `${fixture}/candidate-web-expand.json`,
      "--candidate-tasks-manifest",
      `${fixture}/candidate-tasks-expand.json`,
    ]);
    expect(JSON.parse(stdout)).toMatchObject({
      status: "compatible",
      verificationScope: "synthetic-contract-and-migration-manifests",
      phase: "expand",
    });
  });

  it("fails closed when a prior task cannot support the candidate migration", async () => {
    await expect(
      execFileAsync(process.execPath, [
        script,
        "--prior-web-manifest",
        `${fixture}/prior-web.json`,
        "--prior-tasks-manifest",
        `${fixture}/prior-tasks-incompatible.json`,
        "--candidate-web-manifest",
        `${fixture}/candidate-web-expand.json`,
        "--candidate-tasks-manifest",
        `${fixture}/candidate-tasks-expand.json`,
      ]),
    ).rejects.toThrow("Prior tasks must support the candidate migration");
  });

  it("validates synthetic contract-phase compatibility across web and task manifests", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      script,
      "--prior-web-manifest",
      `${fixture}/prior-web.json`,
      "--prior-tasks-manifest",
      `${fixture}/prior-tasks.json`,
      "--candidate-web-manifest",
      `${fixture}/candidate-web-contract.json`,
      "--candidate-tasks-manifest",
      `${fixture}/candidate-tasks-contract.json`,
    ]);
    expect(JSON.parse(stdout)).toMatchObject({ status: "compatible", phase: "contract" });
  });

  it("fails closed when a candidate task cannot read the prior web contract", async () => {
    await expect(
      execFileAsync(process.execPath, [
        script,
        "--prior-web-manifest",
        `${fixture}/prior-web.json`,
        "--prior-tasks-manifest",
        `${fixture}/prior-tasks.json`,
        "--candidate-web-manifest",
        `${fixture}/candidate-web-expand.json`,
        "--candidate-tasks-manifest",
        `${fixture}/candidate-tasks-contract-incompatible.json`,
      ]),
    ).rejects.toThrow("Candidate tasks must read the prior web contract");
  });
});
