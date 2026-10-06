"use client";
import { Button, Link } from "@oalo/ui";
export default function FunnelError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section>
      <h1>Your funnels could not be loaded.</h1>
      <p>Your saved work has not been replaced.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
      <Link href="/marketing/campaigns">Back to campaigns</Link>
    </section>
  );
}
