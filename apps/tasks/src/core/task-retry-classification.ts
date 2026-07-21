import { z } from "zod";

export type TaskFailureClassification = "non-retryable" | "retryable";

/**
 * Signals a deterministic task contract failure. Trigger task wrappers turn
 * this into AbortTaskRunError so a repeated attempt cannot change the result.
 */
export class TaskPermanentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TaskPermanentError";
  }
}

export function classifyTaskFailure(error: unknown): TaskFailureClassification {
  if (error instanceof z.ZodError || error instanceof TaskPermanentError) {
    return "non-retryable";
  }
  return "retryable";
}

export const FixtureTaskPermanentError = TaskPermanentError;
export const classifyFixtureTaskFailure = classifyTaskFailure;
export type FixtureTaskFailureClassification = TaskFailureClassification;
