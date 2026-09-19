"use client";

import { Button, ErrorState, LoadingState } from "@oalo/ui";
import { useEffect } from "react";

import { SUPPORT_DETAILS_LABELS } from "../../../copy/user-language.js";
import { SupportDetails } from "./support-details.js";

/** What the support reference reads when the framework handed us no digest to quote. */
const PAGE_ERROR_REFERENCE = "Not recorded";

type RouteErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  /** The page's name as a user would say it, used in both the error and the loading title. */
  routeName: string;
}>;

export function RouteError({ error, reset, routeName }: RouteErrorProps) {
  useEffect(() => {
    globalThis.dispatchEvent(
      new CustomEvent("oalo:page-error", {
        detail: Object.freeze({ routeName, digest: error.digest ?? PAGE_ERROR_REFERENCE }),
      }),
    );
  }, [error.digest, routeName]);

  return (
    <ErrorState
      description="We couldn't load this page. Nothing was changed."
      details={
        <SupportDetails
          rows={[[SUPPORT_DETAILS_LABELS.supportReference, error.digest ?? PAGE_ERROR_REFERENCE]]}
        />
      }
      primaryAction={
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      }
      title={`We couldn't load ${routeName}`}
    />
  );
}

export function RouteLoading({ routeName }: Readonly<{ routeName: string }>) {
  return <LoadingState description="This takes a moment." title={`Loading ${routeName}`} />;
}
