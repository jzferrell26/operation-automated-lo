"use client";

import { useRouter } from "next/navigation.js";
import { startTransition } from "react";
import { RouteError } from "../../features/shell/components/route-boundary.js";

export default function AuthenticatedError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const router = useRouter();
  function retry() {
    startTransition(() => {
      // A server read failure needs a fresh payload, not only a client boundary reset.
      router.refresh();
      reset();
    });
  }
  return <RouteError error={error} reset={retry} routeName="your workspace" />;
}
