"use client";

import { RouteError } from "../../features/shell/components/route-boundary.js";

export default function AuthenticatedError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <RouteError error={error} reset={reset} routeName="authenticated workspace" />;
}
