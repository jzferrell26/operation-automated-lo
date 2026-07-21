import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  GhlEvidenceRecordSchema,
  createEvidenceRecord,
  replayEvidenceRecord,
  type EvidenceRecordInput,
} from "../../../packages/ghl/src/evidence.js";

const FIXTURE_FILES = [
  "g1-distribution.json",
  "g2-oauth-session.json",
  "g3-meta-publish.json",
  "g4-special-category.json",
  "g5-routing.json",
  "g6-billing.json",
] as const;

function loadFixture(fileName: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), "utf8"));
}

describe("HighLevel G1 through G6 evidence gates", () => {
  it.each(FIXTURE_FILES)("replays %s as BLOCKED evidence", (fileName) => {
    const record = replayEvidenceRecord(loadFixture(fileName));

    expect(record.evidence.externalStatus).toBe("BLOCKED");
    expect(record.source).toBe("synthetic-fixture");
    expect(record.provider.environment).toBe("synthetic");
    expect(record.evidence.requiredExternalEvidence.length).toBeGreaterThan(0);
  });

  it("covers each external gate exactly once", () => {
    const gates = FIXTURE_FILES.map(
      (fileName) => replayEvidenceRecord(loadFixture(fileName)).gateId,
    );

    expect(new Set(gates)).toEqual(new Set(["G1", "G2", "G3", "G4", "G5", "G6"]));
    expect(gates).toHaveLength(6);
  });

  it("records deterministic hashes for a sanitized fixture", () => {
    const existing = GhlEvidenceRecordSchema.parse(loadFixture(FIXTURE_FILES[0]));
    const {
      requestHash: _requestHash,
      responseHash: _responseHash,
      ...evidenceWithoutHashes
    } = existing.evidence;
    const input: EvidenceRecordInput = {
      ...existing,
      evidence: evidenceWithoutHashes,
    };

    expect(createEvidenceRecord(input)).toEqual(existing);
  });

  it("rejects replay when a recorded response is changed", () => {
    const existing = GhlEvidenceRecordSchema.parse(loadFixture(FIXTURE_FILES[0]));
    const tampered = {
      ...existing,
      response: {
        ...existing.response,
        httpStatus: 200,
      },
    };

    expect(() => replayEvidenceRecord(tampered)).toThrow(/hash mismatch/i);
  });
});
