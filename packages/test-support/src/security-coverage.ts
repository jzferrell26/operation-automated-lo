import { z } from "zod";

const safeIdSchema = z.string().regex(/^[A-Z0-9-]+$/u);
const safePathSchema = z.string().regex(/^[a-z0-9./-]+\.(?:json|mjs|ts|tsx)$/u);

const testCatalogEntrySchema = z
  .object({
    testId: safeIdSchema,
    path: safePathSchema,
  })
  .strict();

const providerContractSchema = z
  .object({
    gateId: z.enum(["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]),
    externalStatus: z.literal("BLOCKED"),
    evidenceMode: z.literal("synthetic-fixture-only"),
    liveProviderCallsAllowed: z.literal(false),
  })
  .strict();

const threatCoverageSchema = z
  .object({
    threatId: safeIdSchema,
    status: z.enum(["TESTED", "CONTRACT_FIXTURE_ONLY", "DEFERRED_AUTHORIZED_PHASE"]),
    testIds: z.array(safeIdSchema),
    providerGateIds: z.array(providerContractSchema.shape.gateId),
    plannedTestId: safeIdSchema.optional(),
    plannedPhase: z
      .enum(["PHASE-1", "PHASE-2", "PHASE-3", "PHASE-4", "PHASE-5", "PHASE-6"])
      .optional(),
  })
  .strict()
  .superRefine((coverage, issue) => {
    if (coverage.status === "TESTED" && coverage.testIds.length === 0) {
      issue.addIssue({
        code: "custom",
        path: ["testIds"],
        message: "TESTED threats require evidence.",
      });
    }
    if (
      coverage.status === "CONTRACT_FIXTURE_ONLY" &&
      (coverage.testIds.length === 0 || coverage.providerGateIds.length === 0)
    ) {
      issue.addIssue({
        code: "custom",
        path: ["providerGateIds"],
        message: "Contract-only threats require fixture tests and an external gate.",
      });
    }
    if (
      coverage.status === "DEFERRED_AUTHORIZED_PHASE" &&
      (coverage.plannedPhase === undefined || coverage.plannedTestId === undefined)
    ) {
      issue.addIssue({
        code: "custom",
        path: ["plannedTestId"],
        message: "Deferred threats require a named phase and planned test.",
      });
    }
  });

export const PhaseZeroSecurityCoverageRegisterSchema = z
  .object({
    schemaVersion: z.literal(1),
    phase: z.literal("phase-0-evidence-harness"),
    productionTrafficEnabled: z.literal(false),
    liveProviderPathEnabled: z.literal(false),
    testCatalog: z.array(testCatalogEntrySchema).min(1),
    providerContracts: z.array(providerContractSchema).length(8),
    threats: z.array(threatCoverageSchema).min(1),
  })
  .strict()
  .superRefine((register, issue) => {
    const testIds = register.testCatalog.map(({ testId }) => testId);
    const gateIds = register.providerContracts.map(({ gateId }) => gateId);
    const threatIds = register.threats.map(({ threatId }) => threatId);
    for (const [path, values] of [
      ["testCatalog", testIds],
      ["providerContracts", gateIds],
      ["threats", threatIds],
    ] as const) {
      if (new Set(values).size !== values.length) {
        issue.addIssue({
          code: "custom",
          path: [path],
          message: `${path} identifiers must be unique.`,
        });
      }
    }
    const knownTests = new Set(testIds);
    const knownGates = new Set(gateIds);
    for (const [index, threat] of register.threats.entries()) {
      if (threat.testIds.some((testId) => !knownTests.has(testId))) {
        issue.addIssue({
          code: "custom",
          path: ["threats", index, "testIds"],
          message: "Unknown test ID.",
        });
      }
      if (threat.providerGateIds.some((gateId) => !knownGates.has(gateId))) {
        issue.addIssue({
          code: "custom",
          path: ["threats", index, "providerGateIds"],
          message: "Unknown gate ID.",
        });
      }
    }
  });

export type PhaseZeroSecurityCoverageRegister = z.infer<
  typeof PhaseZeroSecurityCoverageRegisterSchema
>;
