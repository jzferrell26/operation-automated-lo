import {
  META_ROUTE_ALLOWLIST,
  MetaConnectionSchema,
  MetaPublishingProgressResponseSchema,
  planMetaAllowedOperation,
} from "./meta-adapter.js";

const ActiveLocationMetaReadActions = [
  "get-integration",
  "get-pages",
  "get-instagram-accounts",
  "get-page-forms",
  "get-ad-accounts",
  "get-pixels",
] as const;

export type ActiveLocationMetaReadAction = (typeof ActiveLocationMetaReadActions)[number];

export interface ProductionMetaReadTransport {
  get(
    input: Readonly<{ locationRef: string; route: string }>,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

function assertActiveLocationReadAction(
  action: string,
): asserts action is ActiveLocationMetaReadAction {
  if (!(ActiveLocationMetaReadActions as readonly string[]).includes(action)) {
    throw new Error(
      "Meta production read action is not an active-location integration or asset route.",
    );
  }
}

function exactGetRoute(
  action: ActiveLocationMetaReadAction | "get-publishing-progress",
  locationRef: string,
  parameters: Readonly<{ pageId?: string; campaignId?: string }> = {},
): string {
  const descriptor = planMetaAllowedOperation({ action, locationRef, parameters });
  if (descriptor.method !== "GET" || META_ROUTE_ALLOWLIST[action].method !== "GET") {
    throw new Error("Meta production read transport only permits allowlisted GET routes.");
  }
  return descriptor.route;
}

export async function readActiveLocationMetaConnection(
  locationRef: string,
  transport: ProductionMetaReadTransport,
) {
  const route = exactGetRoute("get-integration", locationRef);
  const connection = MetaConnectionSchema.parse(await transport.get({ locationRef, route }));
  if (connection.locationRef !== locationRef) {
    throw new Error("Meta integration response location does not match the active location scope.");
  }
  return connection;
}

export async function readActiveLocationMetaAssets(
  action: ActiveLocationMetaReadAction,
  locationRef: string,
  transport: ProductionMetaReadTransport,
  parameters: Readonly<{ pageId?: string }> = {},
): Promise<unknown> {
  assertActiveLocationReadAction(action);
  const route = exactGetRoute(action, locationRef, parameters);
  const connection = MetaConnectionSchema.parse(await transport.get({ locationRef, route }));
  if (connection.locationRef !== locationRef) {
    throw new Error("Meta asset response location does not match the active location scope.");
  }
  return connection;
}

export function createMetaPublishingProgressPollingPort(
  input: Readonly<{
    locationRef: string;
    campaignId: string;
    transport: ProductionMetaReadTransport;
  }>,
): Readonly<{ poll(signal?: AbortSignal): Promise<unknown> }> {
  const route = exactGetRoute("get-publishing-progress", input.locationRef, {
    campaignId: input.campaignId,
  });
  return Object.freeze({
    async poll(signal?: AbortSignal) {
      return MetaPublishingProgressResponseSchema.parse(
        await input.transport.get({ locationRef: input.locationRef, route }, signal),
      );
    },
  });
}
