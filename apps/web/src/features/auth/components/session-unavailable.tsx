"use client";

import { AsyncState, Button } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useTransition } from "react";
import { AuthPanel } from "./auth-panel.js";

/** No remembered identity, credential form or workspace content while the session read is unknown. */
export function SessionUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <AuthPanel title="We couldn't check your sign-in">
      <AsyncState
        kind="error"
        title="Please reload this page"
        description="Reload to check your session again."
        primaryAction={
          <Button
            disabled={pending}
            aria-busy={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {pending ? "Reloading..." : "Reload page"}
          </Button>
        }
      />
    </AuthPanel>
  );
}
