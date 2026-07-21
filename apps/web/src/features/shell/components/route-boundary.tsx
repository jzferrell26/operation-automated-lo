"use client";

import { Button, ErrorState, LoadingState } from "@oalo/ui";
import { useEffect } from "react";

type RouteErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  routeName: string;
}>;

export function RouteError({ error, reset, routeName }: RouteErrorProps) {
  useEffect(() => {
    globalThis.dispatchEvent(
      new CustomEvent("oalo:synthetic-route-error", {
        detail: Object.freeze({ routeName, digest: error.digest ?? "synthetic-route-error" }),
      }),
    );
  }, [error.digest, routeName]);

  return (
    <ErrorState
      description={`The ${routeName} fixture could not be rendered. No provider operation was attempted.`}
      details={
        <dl>
          <div>
            <dt>Last safe state</dt>
            <dd>Frozen synthetic fixture remains unchanged</dd>
          </div>
          <div>
            <dt>Correlation ID</dt>
            <dd>{error.digest ?? "synthetic-route-error"}</dd>
          </div>
        </dl>
      }
      primaryAction={
        <Button onClick={reset} variant="secondary">
          Retry safe read
        </Button>
      }
      title={`${routeName} unavailable`}
    />
  );
}

export function RouteLoading({ routeName }: Readonly<{ routeName: string }>) {
  return (
    <LoadingState
      description={`Validating the frozen ${routeName} fixture. No network request is running.`}
      title={`Loading ${routeName}`}
    />
  );
}
