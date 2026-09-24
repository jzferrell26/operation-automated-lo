"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { getInternalJson, postInternalJson } from "../http/internal-api.js";
import {
  WorkspacePreferencesSchema,
  type WorkspacePreferences,
  type WorkspacePreferenceCommand,
} from "./model.js";

const envelope = z.object({ preferences: WorkspacePreferencesSchema });
export function useWorkspacePreferences(initial: WorkspacePreferences) {
  const [preferences, setPreferences] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function execute(command?: WorkspacePreferenceCommand) {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await (command
        ? postInternalJson("/api/workspace/preferences", command)
        : getInternalJson("/api/workspace/preferences"));
      const payload: unknown = await response.json();
      if (!response.ok) {
        const failure = z.object({ message: z.string() }).safeParse(payload);
        throw new Error(
          failure.success ? failure.data.message : "The saved details could not be confirmed.",
        );
      }
      const next = envelope.parse(payload).preferences;
      setPreferences(next);
      setMessage(command ? "Your changes are saved." : "The latest saved details are loaded.");
      return next;
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "The saved details could not be read. Your edits are still here.",
      );
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    preferences,
    busy,
    message,
    error,
    save: (command: WorkspacePreferenceCommand) => execute(command),
    reload: () => execute(),
    clearFeedback: () => {
      setError("");
      setMessage("");
    },
  };
}
