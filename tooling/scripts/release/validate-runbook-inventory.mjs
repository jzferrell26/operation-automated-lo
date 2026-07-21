import { access, readFile } from "node:fs/promises";

import { fail } from "./common.mjs";

const runbooks = [
  "docs/operations/deployment.md",
  "docs/operations/rollback.md",
  "docs/operations/restore-evidence.md",
  "docs/operations/provider-reconciliation.md",
  "docs/operations/incident-severity.md",
  "docs/operations/kill-switches.md",
  "docs/operations/credential-revocation.md",
  "docs/operations/export.md",
  "docs/operations/uninstall.md",
  "docs/operations/retention-and-deletion.md",
];

async function main() {
  if (process.argv.length > 2) {
    throw new Error("Runbook inventory validation does not accept arguments");
  }

  for (const runbook of runbooks) {
    await access(runbook);
    const content = await readFile(runbook, "utf8");
    if (!content.includes("**Execution status:** NOT EXECUTED")) {
      throw new Error(`Runbook does not preserve the not-executed boundary: ${runbook}`);
    }
    if (!content.includes("create-operation-evidence.mjs")) {
      throw new Error(`Runbook does not include the evidence command: ${runbook}`);
    }
  }

  process.stdout.write(
    `${JSON.stringify({ status: "valid", count: runbooks.length, note: "No runbook was executed" })}\n`,
  );
}

main().catch(fail);
