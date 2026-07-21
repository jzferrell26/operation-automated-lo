export class LiveCaptureDisabledError extends Error {
  public constructor() {
    super(
      "Live HighLevel capture is disabled in Phase 0. Use sanitized fixture replay; external evidence remains BLOCKED.",
    );
    this.name = "LiveCaptureDisabledError";
  }
}

export interface DisabledLiveCaptureAdapter {
  readonly mode: "disabled";
  capture(): Promise<never>;
}

export function createLiveCaptureAdapter(): DisabledLiveCaptureAdapter {
  return Object.freeze({
    mode: "disabled" as const,
    capture: () => Promise.reject(new LiveCaptureDisabledError()),
  });
}
