// lib/pipeline/text-optimizer.js
// Generischer Text-Optimizer für L0-L5 Textverarbeitung
// Wird von migrate-products-commercetools und migrate-content-contentful genutzt

// Encoding-Reparatur: kaputte UTF-8 Sequenzen aus Latin-1-Exports fixen
// Wird immer angewendet, auch bei L0
function fixEncoding(text) {
  if (typeof text !== 'string') return text
  try {
    return decodeURIComponent(escape(text))
  } catch {
    return text
  }
}

const LEVEL_PROMPTS = {
  1: (text) => `Korrigiere nur Rechtschreibung und Grammatik in folgendem Text. Ändere nichts am Inhalt, Stil oder der Struktur. Gib nur den korrigierten Text zurück, ohne Erklärungen:\n\n${text}`,
  2: (text) => `Korrigiere Rechtschreibung und Grammatik und verbessere leicht die Formulierungen für bessere Lesbarkeit. Behalte den Inhalt und den Ton bei. Gib nur den verbesserten Text zurück, ohne Erklärungen:\n\n${text}`,
  3: (text, persona) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen und passe den Ton und die Sprache an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}. Behalte alle inhaltlichen Informationen bei. Gib nur den angepassten Text zurück, ohne Erklärungen:\n\n${text}`,
  4: (text, persona, keyword) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen, passe den Ton an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}, und optimiere den Text für SEO. ${keyword ? `Ziel-Keyword: "${keyword}". ` : 'Ermittle selbst das passendste Keyword. '}Integriere das Keyword natürlich. Gib nur den optimierten Text zurück, ohne Erklärungen:\n\n${text}`,
  5: (text, persona, keyword) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen, passe den Ton an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}, optimiere für SEO mit ${keyword ? `Keyword "${keyword}"` : 'selbst ermitteltem Keyword'}, und erweitere den Text um 3-5 relevante FAQs im Format "**Frage:** ...\n**Antwort:** ..." um für AI-Overviews und Featured Snippets zu optimieren. Gib nur den erweiterten Text mit FAQs zurück, ohne Erklärungen:\n\n${text}`,
}

export async function optimizeText(text, settings) {
  const level = settings?.textLevel || 0
  // Encoding immer fixen, auch bei L0
  const fixedText = fixEncoding(text)
  // L0: nur Encoding-Fix, kein KI-Eingriff
  if (level === 0 || !fixedText || fixedText.trim() === '') return fixedText
  const promptFn = LEVEL_PROMPTS[level]
  if (!promptFn) return fixedText
  const persona = settings?.textPersona || ''
  const keyword = settings?.textKeyword || ''
  let prompt
  if (level <= 2) prompt = promptFn(fixedText)
  else if (level === 3) prompt = promptFn(fixedText, persona)
  else prompt = promptFn(fixedText, persona, keyword)
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

// CSV-spezifisch: optimiert alle Text-Spalten einer Row
// Technische Spalten (IDs, Zahlen, Booleans, kurze Codes) werden übersprungen
const SKIP_PATTERNS = /^(id|pk|uid|sku|status|approved|true|false|staged|online|\d+)$/i

export async function optimizeCSVRow(row, contentCols, settings) {
  const level = settings?.textLevel || 0
  const optimized = { ...row }
  const log = []

  for (const col of contentCols) {
    const original = row[col]
    if (!original || typeof original !== 'string') continue
    // Encoding immer fixen
    const fixed = fixEncoding(original)
    if (fixed !== original) {
      log.push({ col, action: 'encoding_fixed', before: original, after: fixed })
    }
    // Technische Werte überspringen
    if (SKIP_PATTERNS.test(fixed.trim())) {
      optimized[col] = fixed
      continue
    }
    // KI nur ab L1
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
