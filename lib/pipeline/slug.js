/**
 * lib/pipeline/slug.js
 *
 * Shared URL-slug generation for migration routes.
 *
 * Converts German umlauts and ligatures to their ASCII equivalents before
 * stripping non-URL characters, so "für" becomes "fuer" instead of "fr".
 */

const UMLAUT_MAP = {
  ae: /ä/g,
  oe: /ö/g,
  ue: /ü/g,
  Ae: /Ä/g,
  Oe: /Ö/g,
  Ue: /Ü/g,
  ss: /ß/g,
}

/**
 * Converts a string to a URL-safe slug.
 *
 * Steps:
 *  1. Replace German umlauts/ligatures with ASCII equivalents
 *  2. Lowercase
 *  3. Replace any remaining non-alphanumeric characters with hyphens
 *  4. Collapse consecutive hyphens
 *  5. Strip leading/trailing hyphens
 *
 * @param {string} str
 * @returns {string}
 */
export function toSlug(str) {
  if (!str || typeof str !== 'string') return ''
  let s = str
  for (const [replacement, pattern] of Object.entries(UMLAUT_MAP)) {
    s = s.replace(pattern, replacement)
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
