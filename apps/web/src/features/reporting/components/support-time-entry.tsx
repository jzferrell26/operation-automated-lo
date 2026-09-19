"use client";

import { Button, Card } from "@oalo/ui";
import { useState, type FormEvent } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticReporting } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";

type SupportTimeEntryProps = Readonly<{
  supportEntry: DeepReadonly<SyntheticReporting["supportEntry"]>;
}>;

export function SupportTimeEntry({ supportEntry }: SupportTimeEntryProps) {
  const [activity, setActivity] = useState<string>(supportEntry.activityOptions[0] ?? "");
  const [minutes, setMinutes] = useState(String(supportEntry.defaultMinutes));
  const [result, setResult] = useState<string | null>(null);

  function stageEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedMinutes = Number(minutes);

    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 5 || parsedMinutes > 240) {
      setResult("Enter a whole number of minutes, from 5 to 240.");
      return;
    }

    setResult(`${activity}: ${parsedMinutes} minutes. Nothing was saved.`);
  }

  return (
    <Card padding="md">
      <form className={styles.supportForm} onSubmit={stageEntry}>
        <div>
          <h2>Log support time</h2>
          <p>Try it out. Nothing is saved yet.</p>
        </div>
        <label>
          Activity
          <select value={activity} onChange={(event) => setActivity(event.target.value)}>
            {supportEntry.activityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes
          <input
            inputMode="numeric"
            max="240"
            min="5"
            onChange={(event) => setMinutes(event.target.value)}
            step="5"
            type="number"
            value={minutes}
          />
        </label>
        <Button type="submit">Add entry</Button>
        {result ? <p role="status">{result}</p> : null}
      </form>
    </Card>
  );
}
