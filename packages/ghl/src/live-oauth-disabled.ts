export class LiveOAuthDisabledError extends Error {
  public constructor() {
    super(
      "Live HighLevel OAuth, signed-context exchange, sessions, and token refresh are disabled in Phase 0.",
    );
    this.name = "LiveOAuthDisabledError";
  }
}

export interface DisabledLiveOAuthAdapter {
  readonly mode: "disabled";
  bootstrapSignedContext(): Promise<never>;
  exchangeAuthorizationCode(): Promise<never>;
  refreshLocationToken(): Promise<never>;
}

export function createLiveOAuthAdapter(): DisabledLiveOAuthAdapter {
  const disabled = (): Promise<never> => Promise.reject(new LiveOAuthDisabledError());
  return Object.freeze({
    mode: "disabled" as const,
    bootstrapSignedContext: disabled,
    exchangeAuthorizationCode: disabled,
    refreshLocationToken: disabled,
  });
}
