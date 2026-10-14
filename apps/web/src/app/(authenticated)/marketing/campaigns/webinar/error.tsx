"use client";
import { Button, Link } from "@oalo/ui";
export default function WebinarError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section>
      <h1>Webinar ad preparation could not be loaded.</h1>
      <p>
        Your saved campaign has not been replaced. Reopen it from Campaigns before starting another
        save.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/marketing/campaigns">Back to Campaigns</Link>
    </section>
  );
}
