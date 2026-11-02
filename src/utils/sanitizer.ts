/**
 * Security & Sanitization Utilities for SVG Rendering and Data Handling
 * Prevents Cross-Site Scripting (XSS), DOM clobbering, and malicious attribute injection.
 */

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
];

/**
 * Sanitizes arbitrary user-supplied text (node labels, ports, notes, subtitles)
 * Ensures safe string rendering within SVG <text> and <foreignObject> containers.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Strip null bytes and invisible control characters (preserve standard spaces and tabs)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Neutralize script tags, javascript: protocols, and inline handlers
  for (const pattern of DANGEROUS_PATTERNS) {
    str = str.replace(pattern, '');
  }

  return str.trim();
}

/**
 * Validates and sanitizes CSS color values to prevent attribute breakout/injection.
 * Only allows valid hex, rgb, rgba, hsl, hsla, or standard safe keywords.
 */
const SAFE_COLOR_REGEX =
  /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)|hsla?\(\s*[\d.]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+\s*(?:,\s*[\d.]+\s*)?\)|transparent|currentColor|[a-zA-Z]{3,20})$/;

export function sanitizeColor(color: unknown, fallback: string = '#94a3b8'): string {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (SAFE_COLOR_REGEX.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Sanitizes a numeric coordinate or dimension, returning a fallback if NaN or infinite.
 */
export function sanitizeNumber(num: unknown, fallback: number = 0): number {
  if (typeof num === 'number' && Number.isFinite(num)) {
    return num;
  }
  const parsed = Number(num);
  return Number.isFinite(parsed) ? parsed : fallback;
}
