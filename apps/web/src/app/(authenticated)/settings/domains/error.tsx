"use client";
import { Button, Link } from "@oalo/ui";
export default function DomainError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section>
      <h1>Domain settings could not be loaded.</h1>
      <p>Reload the saved state before repeating a domain change.</p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/settings">Back to Settings</Link>
    </section>
  );
}
