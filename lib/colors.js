/**
 * Colors Module
 * Terminal color utilities with --no-color support
 */

import pc from 'picocolors';

// Check if colors should be disabled
const noColor = process.env.NO_COLOR !== undefined ||
  process.argv.includes('--no-color') ||
  !process.stdout.isTTY;

/**
 * Create a color function that respects --no-color
 */
function wrap(fn) {
  return (str) => noColor ? str : fn(str);
}

// Export wrapped color functions
export const green = wrap(pc.green);
export const red = wrap(pc.red);
export const yellow = wrap(pc.yellow);
export const blue = wrap(pc.blue);
export const cyan = wrap(pc.cyan);
export const magenta = wrap(pc.magenta);
export const dim = wrap(pc.dim);
export const bold = wrap(pc.bold);
export const underline = wrap(pc.underline);

// Semantic colors for V4V context
export const sats = wrap(pc.cyan);
export const usd = wrap(pc.yellow);
export const positive = wrap(pc.green);
export const negative = wrap(pc.red);
export const muted = wrap(pc.dim);
export const header = wrap(pc.bold);
export const success = wrap(pc.green);
export const warning = wrap(pc.yellow);
export const error = wrap(pc.red);

/**
 * Format a trend indicator with color
 */
export function trend(value, { suffix = '%', showSign = true } = {}) {
  if (value === null || value === undefined || value === 'N/A') {
    return dim('N/A');
  }
  const sign = value >= 0 ? '+' : '';
  const formatted = showSign ? `${sign}${value}${suffix}` : `${value}${suffix}`;
  return value >= 0 ? positive(formatted) : negative(formatted);
}

/**
 * Check if colors are enabled
 */
export function colorsEnabled() {
  return !noColor;
}
