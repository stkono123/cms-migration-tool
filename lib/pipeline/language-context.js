/**
 * lib/pipeline/language-context.js
 *
 * Language detection for the migration pipeline.
 *
 * Design goals:
 *  - Detect language ONCE per migration batch, not per cell or per row.
 *  - Sample from body / long-form content — not from short titles or IDs.
 *  - Accept an explicit user override so teams can skip auto-detection.
 *  - Return a plain LanguageContext object that is passed explicitly through
 *    the pipeline; never mutated onto another object (no side-effects).
 *
 * LanguageContext shape:
 *  {
 *    sourceLanguage: string,   // ISO 639-1 code of the source content  (e.g. 'de')
 *    targetLanguage: string,   // ISO 639-1 code the AI should write in (e.g. 'de')
 *    autoDetected:  boolean,   // true = detected automatically, false = user-supplied
 *  }
 */

import { extractPlainText } from './richtext.js'

// Strings shorter than this are likely IDs, labels, or brand names —
// not representative of the actual content language.
const MIN_MEANINGFUL_LENGTH = 50

// Caps per item so one very long page doesn't dominate the sample.
const MAX_CHARS_PER_ITEM = 400

// How many items to look at (first N rows / pages).
const MAX_SAMPLE_ITEMS = 5

// ─── internal ───────────────────────────────────────────────────────────────

/**
 * Calls Claude Haiku to detect the language of a representative text sample.
 * Returns an ISO 639-1 code ('de', 'en', …). Falls back to 'en' on any error.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
async function detectLanguageFromText(text) {
  try {
    const sample = text.slice(0, 600).trim()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: `What language is this text written in? Reply with only the ISO 639-1 language code (e.g. 'en', 'de', 'fr').\n\n${sample}`,
        }],
      }),
    })
    if (!response.ok) return 'en'
    const data = await response.json()
    const code = data.content?.[0]?.text?.trim().toLowerCase().replace(/[^a-z]/g, '')
    return code || 'en'
  } catch {
    return 'en'
  }
}

/**
 * Builds a representative plain-text sample from an array of raw body values.
 * Each item can be a string or a Contentful RichText document.
 * Short strings (< MIN_MEANINGFUL_LENGTH chars) are skipped.
 *
 * @param {Array<string|object>} items
 * @returns {string}
 */
function buildSample(items) {
  return items
    .slice(0, MAX_SAMPLE_ITEMS)
    .map(item => {
      if (!item) return ''
      if (typeof item === 'string') return item.slice(0, MAX_CHARS_PER_ITEM)
      if (item?.nodeType === 'document') return extractPlainText(item).slice(0, MAX_CHARS_PER_ITEM)
      return ''
    })
    .filter(t => t.trim().length >= MIN_MEANINGFUL_LENGTH)
    .join('\n\n')
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Resolves the LanguageContext for a migration run.
 *
 * Priority:
 *  1. settings.sourceLanguage — explicit user override (always wins, no API call)
 *  2. Auto-detection from representative body content (one API call)
 *  3. Silent fallback to 'en' when no meaningful sample is available
 *
 * Call this ONCE at the start of a migration handler, before the processing
 * loop, and pass the returned context to optimizeText / optimizeCSVRow.
 *
 * @param {object}  options
 * @param {object}  options.settings     - migration settings from the request body
 * @param {Array}   options.bodySamples  - raw body-field values (strings or RichText docs)
 *                                         from the first few rows / pages
 * @returns {Promise<{ sourceLanguage: string, targetLanguage: string, autoDetected: boolean }>}
 */
export async function resolveLanguageContext({ settings = {}, bodySamples = [] } = {}) {
  // 1. Explicit user override — no detection needed
  if (settings.sourceLanguage) {
    return {
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage || settings.sourceLanguage,
      autoDetected: false,
    }
  }

  // 2. Auto-detect from representative body content
  const sample = buildSample(bodySamples)
  if (sample.trim()) {
    const detected = await detectLanguageFromText(sample)
    return {
      sourceLanguage: detected,
      targetLanguage: settings.targetLanguage || detected,
      autoDetected: true,
    }
  }

  // 3. Nothing to detect from — safe fallback
  return {
    sourceLanguage: 'en',
    targetLanguage: settings.targetLanguage || 'en',
    autoDetected: false,
  }
}
