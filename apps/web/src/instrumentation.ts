const InstrumentationState = Symbol.for("oalo.web.instrumentation.state");
const SafeValuePattern = /^[A-Za-z0-9._:/+-]{1,128}$/u;

interface InstrumentationGlobal extends Record<PropertyKey, unknown> {
  [InstrumentationState]?: true;
}

function safeRuntimeValue(value: string | undefined): string {
  return value !== undefined && SafeValuePattern.test(value) ? value : "unknown";
}

function writeSafeEvent(event: string): void {
  const record = {
    timestamp: new Date().toISOString(),
    level: "info",
    event,
    service: "oalo-web",
    environment: safeRuntimeValue(process.env.OALO_ENVIRONMENT),
    version: safeRuntimeValue(process.env.OALO_BUILD_ID),
  };

  globalThis.console.info(JSON.stringify(record));
}

export function register(): void {
  const instrumentationGlobal = globalThis as InstrumentationGlobal;
  if (instrumentationGlobal[InstrumentationState] === true) {
    return;
  }

  instrumentationGlobal[InstrumentationState] = true;
  writeSafeEvent("observability.instrumentation.registered");
}

export function onRequestError(): void {
  writeSafeEvent("http.request.unhandled-error");
}
