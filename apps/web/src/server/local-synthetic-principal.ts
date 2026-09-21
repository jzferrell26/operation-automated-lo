import { freezeAuthenticatedPrincipal, type AuthenticatedPrincipal } from "@oalo/application";

/**
 * PRD-005a D5 and 005A-AC-015. The synthetic principal lives in a module of its own, apart from
 * the resolver that may construct it.
 *
 * 005A-AC-015 is a negative criterion: on a review or production deployment the resolver must
 * refuse an uncredentialled request rather than invent a principal for it. A negative like that is
 * only provable if the construction can be observed, and while the resolver called a function
 * declared beside it, it could not be. A module mock replaces the namespace that importers see; it
 * never rewrites a module's own local binding, so a spy installed over
 * `authenticated-principal.js` recorded nothing the resolver did, and the assertion passed whether
 * or not a synthetic principal had been built.
 *
 * Putting the factory here makes the call an import, so the seam a test mocks is the seam the
 * production path crosses. `runtime-authentication.unit.test.ts` asserts both directions against
 * it: never called in review and production mode, and called in local synthetic mode. The second
 * assertion is the tripwire. If the factory is ever inlined back into the resolver, the positive
 * control fails rather than the negative one quietly becoming vacuous again.
 *
 * `authenticated-principal.ts` re-exports everything below, so the test modules that build a
 * synthetic principal keep importing it from there.
 */

export const LOCAL_SYNTHETIC_LOCATION_ID = "00000000-0000-4000-8000-000000000801";
export const LOCAL_SYNTHETIC_ACTOR_ID = "00000000-0000-4000-8000-000000000811";
export const LOCAL_SYNTHETIC_LOCATION_REF = "location_localWorkspace001";
export const LOCAL_SYNTHETIC_ACTOR_REF = "principal_localUser001";
export const LOCAL_SYNTHETIC_INSTALLATION_REF = "installation_localWorkspace001";
export const LOCAL_SYNTHETIC_SESSION_ID = "session_localSynthetic001";

export function createLocalSyntheticPrincipal(
  overrides: Partial<AuthenticatedPrincipal> = {},
): Readonly<AuthenticatedPrincipal> {
  return freezeAuthenticatedPrincipal({
    actorRef: LOCAL_SYNTHETIC_ACTOR_REF,
    actorId: LOCAL_SYNTHETIC_ACTOR_ID,
    locationRef: LOCAL_SYNTHETIC_LOCATION_REF,
    locationId: LOCAL_SYNTHETIC_LOCATION_ID,
    installationRef: LOCAL_SYNTHETIC_INSTALLATION_REF,
    role: "campaign_creator",
    roleVersion: 1,
    sessionId: LOCAL_SYNTHETIC_SESSION_ID,
    authenticationMode: "local_synthetic",
    ...overrides,
  });
}
