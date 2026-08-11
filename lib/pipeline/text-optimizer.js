// lib/pipeline/text-optimizer.js

function fixEncoding(text) {
  if (typeof text !== 'string') return text
  try {
    return decodeURIComponent(escape(text))
  } catch {
    return text
  }
}

const TOV_LABELS = {
  neutral: 'neutral und sachlich',
  professional: 'professionell und seriös',
  friendly: 'freundlich und nahbar',
  inspiring: 'inspirierend und motivierend',
  technical: 'technisch und präzise',
  luxury: 'exklusiv und hochwertig',
}

function buildTovInstruction(settings) {
  if (settings?.toneOfVoicePdfText) {
    return `Beachte dabei folgende Tone-of-Voice-Richtlinien:\n${settings.toneOfVoicePdfText}\n\n`
  }
  if (settings?.toneOfVoice && settings.toneOfVoice !== 'neutral') {
    const label = TOV_LABELS[settings.toneOfVoice] || settings.toneOfVoice
    return `Schreibe in einem ${label} Ton.\n\n`
  }
  return ''
}

const LEVEL_PROMPTS = {
  1: (text, tov) => `${tov}IMPORTANT: Keep the original language of the text. Do NOT translate under any circumstances. Correct only spelling and grammar in the following text. Do not change anything about the content, style, or structure. Return only the corrected text, without explanations:\n\n${text}`,
  2: (text, tov) => `${tov}IMPORTANT: Keep the original language of the text. Do NOT translate under any circumstances. Correct spelling and grammar and slightly improve the phrasing for better readability. Keep the content and tone unchanged. Return only the improved text, without explanations:\n\n${text}`,
  3: (text, tov, persona) => `${tov}IMPORTANT: Keep the original language of the text. Do NOT translate under any circumstances. Correct spelling and grammar, improve the phrasing, and adapt the tone and language to the following target audience: ${persona || 'general consumers'}. Retain all content information. Return only the adapted text, without explanations:\n\n${text}`,
  4: (text, tov, persona, keyword) => `${tov}IMPORTANT: Keep the original language of the text. Do NOT translate under any circumstances. Correct spelling and grammar, improve the phrasing, adapt the tone to the following target audience: ${persona || 'general consumers'}, and optimise the text for SEO. ${keyword ? `Target keyword: "${keyword}". ` : 'Determine the most suitable keyword yourself. '}Integrate the keyword naturally. Return only the optimised text, without explanations:\n\n${text}`,
  5: (text, tov, persona, keyword) => `${tov}IMPORTANT: Keep the original language of the text. Do NOT translate under any circumstances. Correct spelling and grammar, improve the phrasing, adapt the tone to the following target audience: ${persona || 'general consumers'}, optimise for SEO with ${keyword ? `keyword "${keyword}"` : 'a self-determined keyword'}, and expand the text with 3–5 relevant FAQs in the format "**Question:** ...\n**Answer:** ..." to optimise for AI Overviews and Featured Snippets. Return only the expanded text including the FAQs, without explanations:\n\n${text}`,
}

export async function optimizeText(text, settings) {
  const level = settings?.textLevel || 0
  const fixedText = fixEncoding(text)
  if (level === 0 || !fixedText || fixedText.trim() === '') return fixedText
  const promptFn = LEVEL_PROMPTS[level]
  if (!promptFn) return fixedText
  const tov = buildTovInstruction(settings)
  const persona = settings?.textPersona || ''
  const keyword = settings?.textKeyword || ''
  let prompt
  if (level <= 2) prompt = promptFn(fixedText, tov)
  else if (level === 3) prompt = promptFn(fixedText, tov, persona)
  else prompt = promptFn(fixedText, tov, persona, keyword)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) return fixedText
    const data = await response.json()
    return data.content?.[0]?.text?.trim() || fixedText
  } catch {
    return fixedText
  }
}

const SKIP_PATTERNS = /^(id|pk|uid|sku|status|approved|true|false|staged|online|\d+)$/i

export async function optimizeCSVRow(row, contentCols, settings) {
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
      const enhanced = await optimizeText(fixed, settings)
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
