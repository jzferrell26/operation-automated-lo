export {
  GoldenFixtureRegistrySchema,
  RenderFixtureManifestSchema,
  canonicalBytes,
  canonicalSha256,
  loadGoldenFixtureRegistry,
  loadRenderFixture,
  verifyGoldenFixtureSet,
  type GoldenFixtureRegistry,
  type RenderFixtureManifest,
  type VerifiedGoldenFixture,
} from "./rendering.js";

export {
  MaliciousRenderInputFixtureSchema,
  MaliciousRenderInputFixtureSetSchema,
  assessUntrustedRenderInput,
  type MaliciousRenderInputFixture,
  type RenderInputAssessment,
  type RenderInputRejectionReason,
} from "./render-security.js";

export {
  PhaseZeroSecurityCoverageRegisterSchema,
  type PhaseZeroSecurityCoverageRegister,
} from "./security-coverage.js";
