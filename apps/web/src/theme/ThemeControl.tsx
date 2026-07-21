"use client";

import { ThemeSegmentedControl, type ThemeSegmentedControlProps } from "@oalo/ui";

import { useThemeRuntime } from "./ThemeRuntimeProvider.js";

export type ThemeControlProps = Omit<ThemeSegmentedControlProps, "onValueChange" | "value">;

/** Connects the shared accessible control to the application theme runtime. */
export function ThemeControl(props: ThemeControlProps) {
  const { preference, setPreference } = useThemeRuntime();
  return <ThemeSegmentedControl {...props} value={preference} onValueChange={setPreference} />;
}
