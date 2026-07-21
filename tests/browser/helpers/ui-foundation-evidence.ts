import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const uiFoundationEvidenceDirectory = join(
  process.cwd(),
  "library",
  "requirements",
  "backlog",
  "prd-001-operation-automated-lo",
  "reports",
  "evidence",
  "ui-foundation",
);

export function evidencePath(fileName: string): string {
  mkdirSync(uiFoundationEvidenceDirectory, { recursive: true });
  return join(uiFoundationEvidenceDirectory, fileName);
}

export function writeEvidenceSummary(summary: object): void {
  writeFileSync(
    evidencePath("ui-foundation-browser-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}
