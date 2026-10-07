"use client";
import { Button } from "@oalo/ui";
export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main>
      <h1>This page could not be loaded.</h1>
      <p>Please try again. No request has been submitted by loading this page.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
