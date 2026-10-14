import { z } from "zod";
import {
  getInternalJson,
  postInternalJson,
  refusalFrom,
  type InternalRefusal,
  UNREACHED_REFUSAL,
} from "../http/internal-api.js";
import { userMessageSentence } from "../http/user-messages.js";
import { DOMAIN_API, DomainCommandSchema, DomainStateSchema, FunnelDomainSchema } from "./model.js";

const result = z.object({ domain: FunnelDomainSchema }).strict();
export class DomainClientError extends Error {
  constructor(
    readonly reason:
      "conflict" | "forbidden" | "unavailable" | "cooldown" | "invalid" | "unconfirmed",
    readonly refusal: InternalRefusal = UNREACHED_REFUSAL,
  ) {
    super(reason);
  }
}
async function validate(response: Response, mutation: boolean) {
  if (!response.ok) {
    const refusal = await refusalFrom(response);
    const { code } = refusal;
    const reason =
      response.status === 409 || code === "DOMAIN_CONFLICT"
        ? "conflict"
        : response.status === 401 || response.status === 403
          ? "forbidden"
          : response.status === 429
            ? "cooldown"
            : code === "DOMAIN_INVALID"
              ? "invalid"
              : "unavailable";
    throw new DomainClientError(reason, refusal);
  }
  try {
    return mutation
      ? result.parse(await response.json())
      : DomainStateSchema.parse(await response.json());
  } catch {
    throw new DomainClientError("unconfirmed");
  }
}
export async function loadDomain() {
  const response = await getInternalJson(DOMAIN_API);
  return DomainStateSchema.parse(await validate(response, false));
}
export async function writeDomain(input: z.input<typeof DomainCommandSchema>) {
  const command = DomainCommandSchema.parse(input);
  try {
    const response = await postInternalJson(DOMAIN_API, command);
    return result.parse(await validate(response, true)).domain;
  } catch (error) {
    if (error instanceof DomainClientError) throw error;
    throw new DomainClientError("unconfirmed");
  }
}
export function domainErrorMessage(error: unknown): string {
  if (error instanceof DomainClientError && error.refusal.code)
    return userMessageSentence(error.refusal.code);
  const reason = error instanceof DomainClientError ? error.reason : "unavailable";
  switch (reason) {
    case "conflict":
      return "The saved domain changed during this request. Load the latest saved state before continuing.";
    case "forbidden":
      return "This session cannot change domain settings. Sign in again or load the latest saved state.";
    case "cooldown":
      return "A check is already running or was requested recently. Load the latest saved state and wait before checking again.";
    case "invalid":
      return "The domain request could not be accepted. Check the hostname and load the latest saved state.";
    case "unconfirmed":
      return "The result could not be confirmed. Load the latest saved state before repeating a change. Your typed hostname is still here.";
    default:
      return "Domain settings could not be confirmed. Your typed hostname is still here. Load the latest saved state to try again.";
  }
}
