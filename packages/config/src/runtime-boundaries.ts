export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: Readonly<{ once?: boolean }>,
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

export interface AbortControllerLike<Signal extends AbortSignalLike> {
  readonly signal: Signal;
  abort(reason?: unknown): void;
}

export interface AbortContext<Signal extends AbortSignalLike> {
  readonly signal: Signal;
  timedOut(): boolean;
  dispose(): void;
}

export function createAbortContext<Signal extends AbortSignalLike, Timer>(input: {
  readonly controller: AbortControllerLike<Signal>;
  readonly timeoutMilliseconds: number;
  readonly timeoutReason: unknown;
  readonly externalSignal?: AbortSignalLike;
  readonly scheduleTimeout: (handler: () => void, timeoutMilliseconds: number) => Timer;
  readonly cancelTimeout: (timer: Timer) => void;
}): AbortContext<Signal> {
  let timeoutReached = false;
  const abortFromCaller = (): void => input.controller.abort(input.externalSignal?.reason);
  if (input.externalSignal?.aborted === true) abortFromCaller();
  else input.externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer = input.scheduleTimeout(() => {
    timeoutReached = true;
    input.controller.abort(input.timeoutReason);
  }, input.timeoutMilliseconds);

  return Object.freeze({
    signal: input.controller.signal,
    timedOut: () => timeoutReached,
    dispose() {
      input.cancelTimeout(timer);
      input.externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  });
}

export function raceWithAbort<Result>(
  promise: Promise<Result>,
  signal: AbortSignalLike,
): Promise<Result> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<Result>((resolve, reject) => {
    const onAbort = (): void => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function utf8ByteLength(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) length += 1;
    else if (codePoint <= 0x7ff) length += 2;
    else if (codePoint <= 0xffff) length += 3;
    else length += 4;
  }
  return length;
}
