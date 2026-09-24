"use client";
import { Button, Card } from "@oalo/ui";
export default function HomeownerReportError({ reset }: { reset: () => void }) {
  return (
    <Card padding="lg">
      <h2>Homeowner reports could not be opened.</h2>
      <p>Your saved reports have not been replaced. Try opening this workspace again.</p>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
