/**
 * lib/pipeline/text-optimizer.js
 *
 * AI-assisted text optimisation pipeline for migration content.
 *
 * Key design decisions:
 *  - fixEncoding is exported so other modules can reuse it without duplication.
 *  - Language is NO LONGER detected inside this module. Instead, callers must
 *    resolve a LanguageContext upfront (via lib/pipeline/language-context.js)
 *    and pass it in. This avoids mutating the settings object and ensures the
 *    correct language is derived from representative body content rather than
 *    the first (potentially short or identifier-like) string processed.
 *  - optimizeText and optimizeCSVRow are pure with respect to their arguments:
 *    they do not mutate settings or any other shared state.
 */

/**
 * Fixes common Mojibake / double-encoded UTF-8 issues.
 * Exported so that analysis routes can reuse it without a local copy.
 *
 * @param {*} text
 * @returns {*} corrected string, or the original value if not a string
 */
export function fixEncoding(text) {
  if (typeof text !== 'string') return text
  try {
    return decodeURIComponent(escape(text))
  } catch {
    return text
  }
}

// ─── Tone-of-Voice ──────────────────────────────────────────────────────────

const TOV_LABELS = {
  neutral:      'neutral and factual',
  professional: 'professional and authoritative',
  friendly:     'friendly and approachable',
  inspiring:    'inspiring and motivating',
  technical:    'technical and precise',
  luxury:       'exclusive and premium',
}

function buildTovInstruction(settings) {
  if (settings?.toneOfVoicePdfText) {
    return `Observe the following tone-of-voice guidelines:\n${settings.toneOfVoicePdfText}\n\n`
  }
  if (settings?.toneOfVoice && settings.toneOfVoice !== 'neutral') {
    const label = TOV_LABELS[settings.toneOfVoice] || settings.toneOfVoice
    return `Write in a ${label} tone.\n\n`
  }
  return ''
}

// ─── Level prompts ──────────────────────────────────────────────────────────

const LEVEL_PROMPTS = {
  1: (text, tov) =>
    `${tov}Correct only spelling and grammar in the following text. Do not change anything about the content, style, or structure. Return only the corrected text, without explanations:\n\n${text}`,
  2: (text, tov) =>
    `${tov}Correct spelling and grammar and slightly improve the phrasing for better readability. Keep the content and tone unchanged. Return only the improved text, without explanations:\n\n${text}`,
  3: (text, tov, persona) =>
    `${tov}Correct spelling and grammar, improve the phrasing, and adapt the tone and language to the following target audience: ${persona || 'general consumers'}. Retain all content information. Return only the adapted text, without explanations:\n\n${text}`,
  4: (text, tov, persona, keyword) =>
    `${tov}Correct spelling and grammar, improve the phrasing, adapt the tone to the following target audience: ${persona || 'general consumers'}, and optimise the text for SEO. ${keyword ? `Target keyword: "${keyword}". ` : 'Determine the most suitable keyword yourself. '}Integrate the keyword naturally. Return only the optimised text, without explanations:\n\n${text}`,
  5: (text, tov, persona, keyword) =>
    `${tov}Correct spelling and grammar, improve the phrasing, adapt the tone to the following target audience: ${persona || 'general consumers'}, optimise for SEO with ${keyword ? `keyword "${keyword}"` : 'a self-determined keyword'}, and expand the text with 3–5 relevant FAQs in the format "**Question:** ...\n**Answer:** ..." to optimise for AI Overviews and Featured Snippets. Return only the expanded text including the FAQs, without explanations:\n\n${text}`,
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Optimises a single text string at the requested level.
 *
 * @param {string} text            - The text to optimise (after encoding fix).
 * @param {object} settings        - { textLevel, toneOfVoice, toneOfVoicePdfText,
 *                                     textPersona, textKeyword }
 * @param {{ sourceLanguage: string, targetLanguage: string }} [languageContext]
 *   Language context resolved by lib/pipeline/language-context.js.
 *   Falls back to { sourceLanguage: 'en', targetLanguage: 'en' } when omitted.
 * @returns {Promise<string>} Optimised text, or original on any error.
 */
export async function optimizeText(text, settings, languageContext) {
  const level = settings?.textLevel || 0
  const fixedText = fixEncoding(text)
  if (level === 0 || !fixedText || typeof fixedText !== 'string' || fixedText.trim() === '') {
    return fixedText
  }

  const promptFn = LEVEL_PROMPTS[level]
  if (!promptFn) return fixedText

  // Use the pre-resolved language context; fall back to English if absent.
  const sourceLang = languageContext?.sourceLanguage || 'en'
  const targetLang  = languageContext?.targetLanguage  || sourceLang

  const langInstruction = `IMPORTANT: The source text is in "${sourceLang}". Write the entire output in "${targetLang}". Do NOT switch languages.\n\n`
  const tov     = buildTovInstruction(settings)
  const persona = settings?.textPersona || ''
  const keyword = settings?.textKeyword || ''

  let prompt
  if (level <= 2)      prompt = langInstruction + promptFn(fixedText, tov)
  else if (level === 3) prompt = langInstruction + promptFn(fixedText, tov, persona)
  else                  prompt = langInstruction + promptFn(fixedText, tov, persona, keyword)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('optimizeText API error:', response.status, errBody)
      return fixedText
    }

    const data = await response.json()
    const result = data.content?.[0]?.text?.trim()
    if (!result) {
      console.error('optimizeText: empty response from Claude', JSON.stringify(data))
    }
    return result || fixedText
  } catch (e) {
    console.error('optimizeText exception:', e.message)
    return fixedText
  }
}

// Columns whose values are always identifiers — never feed into the AI.
const SKIP_PATTERNS = /^(id|pk|uid|sku|status|approved|true|false|staged|online|\d+)$/i

/**
 * Optimises all designated content columns in a single CSV row.
 *
 * @param {object}   row            - Raw CSV row object.
 * @param {string[]} contentCols    - Column names to process.
 * @param {object}   settings       - Optimisation settings.
 * @param {{ sourceLanguage: string, targetLanguage: string }} [languageContext]
 *   Pre-resolved language context. Pass the same instance for every row in a
 *   batch — detection has already happened and must not repeat per row.
 * @returns {Promise<{ optimized: object, log: Array }>}
 */
export async function optimizeCSVRow(row, contentCols, settings, languageContext) {
  const level = settings?.textLevel || 0
  const optimized = { ...row }
  const log = []

  for (const col of contentCols) {
    const original = row[col]
    if (!original || typeof original !== 'string') continue

    const fixed = fixEncoding(original)
    if (fixed !== original) {
      log.push({ col, action: 'encoding_fixed', before: original, after: fixed })
    }

    if (SKIP_PATTERNS.test(fixed.trim())) {
      optimized[col] = fixed
      continue
    }

    if (level >= 1) {
      const enhanced = await optimizeText(fixed, settings, languageContext)
      optimized[col] = enhanced
      if (enhanced !== fixed) {
        log.push({ col, action: `l${level}_enhanced`, before: fixed, after: enhanced })
      }
    } else {
      optimized[col] = fixed
    }
  }

  return { optimized, log }
}
