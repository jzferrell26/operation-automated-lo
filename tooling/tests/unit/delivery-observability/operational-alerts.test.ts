import { describe, expect, it } from "vitest";

import {
  OperationalAlertTaxonomy,
  createOperationalAlert,
  documentedResponseLink,
} from "../../../../packages/observability/src/index.js";

const baseAlert = {
  schemaVersion: 1,
  alertRef: "alert_01Storage",
  kind: OperationalAlertTaxonomy.privateTransferRejected,
  severity: "critical" as const,
  correlationId: "corr_storage_alert_001",
  resourceRef: "artifact_01Approved",
  reasonCode: "PRIVATE_BUCKET_MISMATCH",
  responseLink: documentedResponseLink(OperationalAlertTaxonomy.privateTransferRejected),
  occurredAt: "2026-07-21T12:00:00.000Z",
};

describe("operational alert records", () => {
  it("requires a correlation ID and the stable documented response link", () => {
    expect(createOperationalAlert(baseAlert)).toEqual(baseAlert);
    expect(() => createOperationalAlert({ ...baseAlert, correlationId: "missing" })).toThrow();
    expect(() =>
      createOperationalAlert({ ...baseAlert, responseLink: "https://unsafe.test/runbook" }),
    ).toThrow("documented runbook response");
  });

  it("uses a closed taxonomy with no free-form payload fields", () => {
    expect(() => createOperationalAlert({ ...baseAlert, kind: "storage.other" })).toThrow();
    expect(() => createOperationalAlert({ ...baseAlert, email: "person@example.test" })).toThrow();
  });
});
