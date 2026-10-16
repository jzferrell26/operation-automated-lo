import type { FinancingReleaseRenderInput } from "@oalo/application";
export function longOutputFixture(): FinancingReleaseRenderInput;
export function outputFixture(
  count?: number,
  images?: readonly Readonly<{
    sha256: string;
    bytes: Uint8Array;
    mimeType: "image/png" | "image/jpeg";
  }>[],
): FinancingReleaseRenderInput;
