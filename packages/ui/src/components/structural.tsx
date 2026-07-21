import { forwardRef, type HTMLAttributes } from "react";

import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type SurfaceVariant = "card" | "sunken" | "raised" | "plain";
export type SurfacePadding = "none" | "sm" | "md" | "lg";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { className, variant = "card", padding = "md", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={joinClassNames("oalo-surface", className)}
      data-padding={padding}
      data-variant={variant}
    />
  );
});

Surface.displayName = "Surface";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: SurfacePadding;
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { className, padding = "md", ...props },
  ref,
) {
  return (
    <article
      ref={ref}
      {...props}
      className={joinClassNames("oalo-surface", className)}
      data-padding={padding}
      data-variant="card"
    />
  );
});

Card.displayName = "Card";

export type StackGap = "none" | "1" | "2" | "3" | "4" | "5" | "6" | "8";
export type StackAlign = "start" | "center" | "end" | "stretch";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: StackGap;
  align?: StackAlign;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { align = "stretch", className, gap = "4", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={joinClassNames("oalo-stack", className)}
      data-align={align}
      data-gap={gap}
    />
  );
});

Stack.displayName = "Stack";
