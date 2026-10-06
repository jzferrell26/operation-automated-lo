import type { AuthenticatedPrincipal } from "@oalo/application";
import { embeddedSessionFixture } from "./campaign-command-test-support.js";

/** Real signed session fixture for one local test actor, with the same browser mutation policy. */
export function singleActorSessionFixture(principal: Readonly<AuthenticatedPrincipal>) {
  return embeddedSessionFixture({
    locationRef: principal.locationRef,
    locationId: principal.locationId,
    installationRef: principal.installationRef,
    actors: [{ actorRef: principal.actorRef, actorId: principal.actorId, role: principal.role }],
    mutation: {
      expectedHost: "app.operation-automated-lo.test",
      allowedBrowserOrigins: ["https://app.operation-automated-lo.test"],
      csrfServerSecret: new Uint8Array(32).fill(7),
    },
  });
}
