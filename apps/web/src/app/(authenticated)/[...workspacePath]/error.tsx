"use client";
import { Button, Card, Link } from "@oalo/ui";
export default function WorkspacePageError({ reset }: { reset: () => void }) {
  return (
    <Card padding="lg">
      <h1>This workspace page could not be opened.</h1>
      <p>Your saved details have not been replaced. Try loading the page again.</p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/overview" variant="action">
        Back to overview
      </Link>
    </Card>
  );
}
