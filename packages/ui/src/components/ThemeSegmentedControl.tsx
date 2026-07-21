"use client";

import { useRef, type KeyboardEvent } from "react";

import { Icon, type IconName } from "./Icon.js";
import styles from "./ThemeSegmentedControl.module.css";

export type ThemePreference = "light" | "dark" | "system";

export type ThemeSegmentedControlProps = Readonly<{
  className?: string;
  disabled?: boolean;
  label?: string;
  onValueChange: (preference: ThemePreference) => void;
  value: ThemePreference;
}>;

const themeOptions = Object.freeze([
  Object.freeze({ value: "light", label: "Light", icon: "sun" }),
  Object.freeze({ value: "dark", label: "Dark", icon: "moon" }),
  Object.freeze({ value: "system", label: "System", icon: "monitor" }),
] satisfies ReadonlyArray<Readonly<{ value: ThemePreference; label: string; icon: IconName }>>);

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function ThemeSegmentedControl({
  className,
  disabled = false,
  label = "Appearance theme",
  onValueChange,
  value,
}: ThemeSegmentedControlProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAndFocus(nextIndex: number) {
    const option = themeOptions[nextIndex];
    if (!option) {
      return;
    }

    onValueChange(option.value);
    optionRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (disabled) {
      return;
    }

    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + themeOptions.length) % themeOptions.length;
        break;
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % themeOptions.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = themeOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(nextIndex);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={classNames(styles.group, className)}
    >
      {themeOptions.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            className={styles.segment}
            data-theme-preference={option.value}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon name={option.icon} size="sm" decorative />
            <span className={styles.label}>{option.label}</span>
            <span className={styles.selectedGlyph} aria-hidden="true">
              {selected ? <Icon name="check" size="sm" decorative /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
