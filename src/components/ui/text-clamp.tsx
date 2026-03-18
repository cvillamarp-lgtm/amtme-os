/**
 * TextClamp — universal text display component.
 *
 * Policy (applied in order, automatically):
 * 1. CSS font-size clamp(): auto-scales between minSize and natural size.
 * 2. line-clamp: cuts at N lines with "…" ellipsis.
 * 3. Tooltip: shows full text on hover (desktop) and long-press (mobile).
 *
 * Content in DB is never modified — purely presentational.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { lineClampClass } from "@/lib/text-utils";

type Lines = 1 | 2 | 3 | 4;
type As = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "td" | "li";

export interface TextClampProps {
  /** The text to display. Can be a string or any renderable node; tooltip only works with string. */
  children: React.ReactNode;
  /** Maximum lines before clamping. Default: 1 */
  lines?: Lines;
  /** Show a tooltip with the full text on hover. Default: true when children is a string. */
  tooltip?: boolean;
  /** Element to render as. Default: "span" */
  as?: As;
  /** Additional className */
  className?: string;
  /** Minimum font-size in px (CSS clamp floor). Default: 12 */
  minSizePx?: number;
  /** Maximum font-size in px (CSS clamp ceiling). Default: undefined (no clamping) */
  maxSizePx?: number;
  /** Viewport-width value for preferred font-size, e.g. 2.5 → 2.5vw. Default: undefined */
  preferredVw?: number;
}

export function TextClamp({
  children,
  lines = 1,
  tooltip,
  as: Tag = "span",
  className,
  minSizePx,
  maxSizePx,
  preferredVw,
}: TextClampProps) {
  const textContent = typeof children === "string" ? children : undefined;
  const showTooltip = tooltip ?? !!textContent;

  const style: React.CSSProperties = {};
  if (minSizePx !== undefined && preferredVw !== undefined && maxSizePx !== undefined) {
    style.fontSize = `clamp(${minSizePx}px, ${preferredVw}vw, ${maxSizePx}px)`;
  }

  const element = (
    <Tag
      className={cn(lineClampClass(lines), "min-w-0 break-words", className)}
      style={style}
      title={showTooltip && textContent ? textContent : undefined}
    >
      {children}
    </Tag>
  );

  // On desktop: use Radix tooltip for rich styling.
  // The native `title` attribute covers mobile long-press fallback.
  if (showTooltip && textContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs leading-snug whitespace-normal"
        >
          {textContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  return element;
}

/**
 * Convenience: single-line truncation with tooltip.
 * Use for table cells, nav labels, badge text, button labels.
 */
export function TruncatedText({
  children,
  className,
  maxSizePx,
  minSizePx = 12,
  preferredVw,
}: Omit<TextClampProps, "lines" | "as">) {
  return (
    <TextClamp
      lines={1}
      tooltip
      className={className}
      minSizePx={minSizePx}
      maxSizePx={maxSizePx}
      preferredVw={preferredVw}
    >
      {children}
    </TextClamp>
  );
}

/**
 * Convenience: episode/card title — 2-line clamp, auto font-size, tooltip.
 * minSize: 18px (titles), responsive between 18px and 20px.
 */
export function TitleClamp({
  children,
  className,
  lines = 2,
}: {
  children: React.ReactNode;
  className?: string;
  lines?: Lines;
}) {
  return (
    <TextClamp
      as="span"
      lines={lines}
      tooltip
      className={cn("font-medium", className)}
      minSizePx={18}
      preferredVw={1.4}
      maxSizePx={20}
    >
      {children}
    </TextClamp>
  );
}

/**
 * Convenience: subtitle / description — 3-line clamp, 14px min.
 */
export function SubtitleClamp({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TextClamp
      as="p"
      lines={3}
      tooltip
      className={cn("text-sm text-muted-foreground", className)}
      minSizePx={14}
      preferredVw={1.2}
      maxSizePx={15}
    >
      {children}
    </TextClamp>
  );
}

/**
 * Convenience: meta / label text — 1-line, 12px min.
 */
export function MetaText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TextClamp
      as="span"
      lines={1}
      tooltip
      className={cn("text-xs text-muted-foreground", className)}
      minSizePx={12}
    >
      {children}
    </TextClamp>
  );
}
