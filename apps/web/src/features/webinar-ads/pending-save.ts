import { WebinarAdPreparationRequestSchema } from "@oalo/contracts";
import { z } from "zod";
import type { WebinarRequest } from "./preparation-model.js";
export const WEBINAR_PENDING_KEY = "oalo:webinar-pending.v1";
// Keep places as transport strings. The command schema validates their normalized meaning.
const transport = z
  .object({ ...WebinarAdPreparationRequestSchema.shape, places: z.array(z.string()) })
  .strict()
  .superRefine((value, context) => {
    const parsed = WebinarAdPreparationRequestSchema.safeParse(value);
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: "Invalid retained preparation.",
        });
  });
export type PendingWebinarSave =
  | { kind: "none" }
  | { kind: "stored"; request: WebinarRequest }
  | { kind: "invalid" }
  | { kind: "unavailable" };
export function readPendingWebinarSave(): PendingWebinarSave {
  try {
    const stored = window.sessionStorage.getItem(WEBINAR_PENDING_KEY);
    if (stored === null) return { kind: "none" };
    if (new TextEncoder().encode(stored).byteLength > 8192) return { kind: "invalid" };
    const parsed = transport.safeParse(JSON.parse(stored));
    return parsed.success ? { kind: "stored", request: parsed.data } : { kind: "invalid" };
  } catch (error) {
    return error instanceof SyntaxError ? { kind: "invalid" } : { kind: "unavailable" };
  }
}
export function retainPendingWebinarSave(request: WebinarRequest): boolean {
  try {
    const parsed = transport.safeParse(request);
    if (!parsed.success) return false;
    const body = JSON.stringify(parsed.data);
    if (new TextEncoder().encode(body).byteLength > 8192) return false;
    window.sessionStorage.setItem(WEBINAR_PENDING_KEY, body);
    return window.sessionStorage.getItem(WEBINAR_PENDING_KEY) === body;
  } catch {
    return false;
  }
}
export function clearPendingWebinarSave(): boolean {
  try {
    window.sessionStorage.removeItem(WEBINAR_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
