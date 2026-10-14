import {
  FINANCING_MEDIA_MAX_BYTES,
  FinancingMediaSnapshotSchema,
  type FinancingRightsBasis,
} from "@oalo/contracts";
import { CSRF_REQUEST_HEADER, readCsrfToken } from "../http/internal-api.js";
import { FINANCING_API_PATH } from "./model.js";
import { z } from "zod";

const { altText: _placementOnly, ...uploadFields } = FinancingMediaSnapshotSchema.shape;
export const FinancingUploadResponseSchema = z
  .object(uploadFields)
  .strict()
  .refine((value) => value.width * value.height <= 12_000_000);
export function financingFileProblem(file: File): string | null {
  if (file.type !== "image/jpeg" && file.type !== "image/png")
    return "Choose one JPEG or PNG photograph.";
  if (file.size < 1 || file.size > FINANCING_MEDIA_MAX_BYTES)
    return "Choose a photograph no larger than 2 MiB.";
  return null;
}
/** Raw bounded upload on the authenticated application origin. Rights are confirmed explicitly by the author. */
export async function uploadFinancingPhotograph(
  file: File,
  requestId: string,
  basis: FinancingRightsBasis,
) {
  const token = readCsrfToken();
  return globalThis["fetch"](`${FINANCING_API_PATH}/media`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: {
      "content-type": file.type,
      "x-oalo-media-request-id": requestId,
      "x-oalo-media-rights-basis": basis,
      "x-oalo-media-rights-confirmed": "true",
      ...(token === undefined ? {} : { [CSRF_REQUEST_HEADER]: token }),
    },
    body: file,
  });
}
