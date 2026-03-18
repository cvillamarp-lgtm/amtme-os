/**
 * Text utilities for display-only truncation.
 * Never mutates content stored in DB — only affects presentation.
 */

/**
 * Truncate text to maxChars, preserving complete words when possible.
 * Returns the original string if it fits.
 */
export function truncateText(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? sliced.slice(0, lastSpace) : sliced) + "…";
}

/**
 * Returns true when text is longer than maxChars (i.e. it will be truncated).
 */
export function willTruncate(text: string, maxChars: number): boolean {
  return !!text && text.length > maxChars;
}

/**
 * Tailwind line-clamp class by number of lines.
 */
export function lineClampClass(lines: 1 | 2 | 3 | 4): string {
  const map = {
    1: "line-clamp-1",
    2: "line-clamp-2",
    3: "line-clamp-3",
    4: "line-clamp-4",
  };
  return map[lines];
}

/**
 * CSS clamp() string for responsive font-size auto-fit.
 * minPx — smallest allowed (12px mobile, 14px body, 18px titles)
 * preferredVw — viewport-relative preferred size
 * maxPx — largest allowed
 */
export function clampFontSize(minPx: number, preferredVw: number, maxPx: number): string {
  return `clamp(${minPx}px, ${preferredVw}vw, ${maxPx}px)`;
}
