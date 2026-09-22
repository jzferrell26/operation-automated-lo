"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FormField, type FieldRequirement } from "./FormField.js";
import { Icon } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import styles from "./Select.module.css";

export type SelectOption = Readonly<{
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}>;
export type SelectProps = Readonly<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (string | SelectOption)[];
  name?: string | undefined;
  placeholder?: string | undefined;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean | undefined;
  requirement?: FieldRequirement | undefined;
  className?: string | undefined;
  compact?: boolean | undefined;
}>;

export function Select({
  label,
  value,
  onValueChange,
  options,
  name,
  placeholder = "Choose an option",
  description,
  error,
  disabled = false,
  requirement,
  className,
  compact = false,
}: SelectProps) {
  const items = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  const selected = items.findIndex((item) => item.value === value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected < 0 ? 0 : selected);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    side: string;
  } | null>(null);
  const [portal, setPortal] = useState<Element | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const listId = `${useId()}-options`;

  function choose(index: number) {
    const option = items[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  }
  function firstEnabled(from: number, direction: 1 | -1): number {
    for (let index = from; index >= 0 && index < items.length; index += direction) {
      if (!items[index]?.disabled) return index;
    }
    return active;
  }
  function show(
    index = selected >= 0 && !items[selected]?.disabled ? selected : firstEnabled(0, 1),
  ) {
    if (disabled || !items.some((item) => !item.disabled)) return;
    setActive(index);
    setPortal(
      trigger.current?.closest('[role="dialog"], [role="alertdialog"]') ??
        trigger.current?.closest('[data-product-shell="true"]') ??
        document.body,
    );
    setOpen(true);
  }
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    let frame = 0;
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 16;
      const bottomEdge = topEdge + (viewport?.height ?? innerHeight) - 16;
      if (rect.bottom < topEdge || rect.top > bottomEdge) {
        setOpen(false);
        return;
      }
      const below = Math.max(0, bottomEdge - rect.bottom - 6);
      const above = Math.max(0, rect.top - topEdge - 6);
      const up = below < Math.min(items.length * 48 + 12, 240) && above > below;
      const height = Math.min(304, up ? above : below);
      const width = Math.min(Math.max(rect.width, 180), rightEdge - leftEdge);
      const actualHeight = Math.min(height, popup.current?.scrollHeight ?? height);
      setPlacement({
        left: Math.min(Math.max(rect.left, leftEdge), rightEdge - width),
        width,
        height,
        top: up ? rect.top - actualHeight - 6 : rect.bottom + 6,
        side: up ? "top" : "bottom",
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    position();
    const observer = new ResizeObserver(schedule);
    if (trigger.current) observer.observe(trigger.current);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !popup.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [open, items.length]);
  useEffect(() => {
    if (!open || !popup.current) return;
    const option = popup.current.children[active] as HTMLElement | undefined;
    if (!option) return;
    const list = popup.current;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, open, placement?.height]);

  function keydown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      if (open) choose(active);
      return;
    }
    if (
      ["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(
        event.key,
      )
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter" || event.key === " ") {
        if (open) choose(active);
        else show();
        return;
      }
      if (event.key === "Home") {
        if (!open) show(firstEnabled(0, 1));
        else setActive(firstEnabled(0, 1));
        return;
      }
      if (event.key === "End") {
        if (!open) show(firstEnabled(items.length - 1, -1));
        else setActive(firstEnabled(items.length - 1, -1));
        return;
      }
      if (!open) {
        show();
        return;
      }
      if (event.altKey && event.key === "ArrowUp") {
        choose(active);
        return;
      }
      const direction = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
      const distance = event.key.startsWith("Page") ? 10 : 1;
      setActive(
        firstEnabled(
          Math.max(0, Math.min(items.length - 1, active + direction * distance)),
          direction,
        ),
      );
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const buffer =
        now - typeahead.current.at > 700 ? event.key : typeahead.current.text + event.key;
      typeahead.current = { text: buffer, at: now };
      const repeated = [...buffer].every((char) => char.toLowerCase() === event.key.toLowerCase());
      const query = (repeated ? event.key : buffer).toLowerCase();
      const start = repeated ? active + 1 : 0;
      for (let offset = 0; offset < items.length; offset++) {
        const index = (start + offset) % items.length;
        if (!items[index]?.disabled && items[index]?.label.toLowerCase().startsWith(query)) {
          if (open) setActive(index);
          else show(index);
          break;
        }
      }
    }
  }
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      requirement={requirement}
      className={joinClassNames(styles.field, compact && styles.compact, className)}
    >
      {({ required: _required, ...control }) => (
        <>
          {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
          <button
            {...control}
            ref={trigger}
            type="button"
            role="combobox"
            aria-required={requirement === "required" || undefined}
            aria-haspopup="listbox"
            aria-controls={open ? listId : undefined}
            aria-expanded={open}
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            disabled={disabled || !items.some((item) => !item.disabled)}
            className={styles.trigger}
            data-empty={selected < 0 || undefined}
            onClick={() => (open ? setOpen(false) : show())}
            onKeyDown={keydown}
            onBlur={() => setOpen(false)}
          >
            <span>{items[selected]?.label ?? placeholder}</span>
            <Icon name="chevron-down" decorative size="sm" />
          </button>
          {open && portal
            ? createPortal(
                <div
                  id={listId}
                  ref={popup}
                  role="listbox"
                  aria-label={label}
                  className={styles.popup}
                  data-side={placement?.side}
                  style={{
                    position: "fixed",
                    left: placement?.left,
                    top: placement?.top,
                    width: placement?.width,
                    maxHeight: placement?.height,
                    visibility: placement ? "visible" : "hidden",
                  }}
                  onPointerDown={(event) => event.preventDefault()}
                >
                  {items.map((option, index) => (
                    <div
                      id={`${listId}-${index}`}
                      key={option.value}
                      role="option"
                      aria-selected={option.value === value}
                      aria-disabled={option.disabled || undefined}
                      data-active={index === active || undefined}
                      className={styles.option}
                      onPointerMove={() => {
                        if (!option.disabled) setActive(index);
                      }}
                      onClick={() => choose(index)}
                    >
                      <span>
                        <strong>{option.label}</strong>
                        {option.description ? <small>{option.description}</small> : null}
                      </span>
                      {option.value === value ? <Icon name="check" decorative size="sm" /> : null}
                    </div>
                  ))}
                </div>,
                portal,
              )
            : null}
        </>
      )}
    </FormField>
  );
}
