import type {
  FinancingMediaRecord,
  FinancingMediaRevocation,
  FinancingMediaSnapshot,
} from "@oalo/contracts";

export interface FinancingMediaRepository {
  find(
    mediaRef: string,
  ): Promise<
    | Readonly<{ record: FinancingMediaRecord; revocation: FinancingMediaRevocation | null }>
    | undefined
  >;
  commitReady(record: FinancingMediaRecord): Promise<FinancingMediaRecord>;
  revoke(mediaRef: string): Promise<FinancingMediaRevocation>;
}
export interface FinancingMediaBytesPort {
  putImmutable(record: FinancingMediaRecord, bytes: Uint8Array): Promise<void>;
  read(record: FinancingMediaRecord): Promise<Uint8Array>;
}
export interface ResolvedFinancingMedia {
  readonly snapshot: FinancingMediaSnapshot;
  readonly bytes: Uint8Array;
}
export class FinancingMediaError extends Error {
  constructor(
    public readonly code:
      | "FINANCING_MEDIA_INVALID"
      | "FINANCING_MEDIA_TOO_LARGE"
      | "FINANCING_MEDIA_UNSUPPORTED"
      | "FINANCING_MEDIA_NOT_FOUND"
      | "FINANCING_MEDIA_CONFLICT"
      | "FINANCING_MEDIA_REVOKED"
      | "FINANCING_MEDIA_INTEGRITY_FAILED"
      | "FINANCING_MEDIA_BUSY"
      | "FINANCING_MEDIA_UNAVAILABLE",
    public readonly status: number,
  ) {
    super(code);
    this.name = "FinancingMediaError";
  }
}
