// lib/pipeline/text-optimizer.js
// Generischer Text-Optimizer für L0-L5 Textverarbeitung
// Wird von migrate-products-commercetools und migrate-content-contentful genutzt

const LEVEL_PROMPTS = {
  1: (text) => `Korrigiere nur Rechtschreibung und Grammatik in folgendem Text. Ändere nichts am Inhalt, Stil oder der Struktur. Gib nur den korrigierten Text zurück, ohne Erklärungen:\n\n${text}`,

  2: (text) => `Korrigiere Rechtschreibung und Grammatik und verbessere leicht die Formulierungen für bessere Lesbarkeit. Behalte den Inhalt und den Ton bei. Gib nur den verbesserten Text zurück, ohne Erklärungen:\n\n${text}`,

  3: (text, persona) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen und passe den Ton und die Sprache an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}. Behalte alle inhaltlichen Informationen bei. Gib nur den angepassten Text zurück, ohne Erklärungen:\n\n${text}`,

  4: (text, persona, keyword) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen, passe den Ton an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}, und optimiere den Text für SEO. ${keyword ? `Ziel-Keyword: "${keyword}". ` : 'Ermittle selbst das passendste Keyword. '}Integriere das Keyword natürlich. Gib nur den optimierten Text zurück, ohne Erklärungen:\n\n${text}`,

  5: (text, persona, keyword) => `Korrigiere Rechtschreibung und Grammatik, verbessere die Formulierungen, passe den Ton an folgende Zielgruppe an: ${persona || 'allgemeine Verbraucher'}, optimiere für SEO mit ${keyword ? `Keyword "${keyword}"` : 'selbst ermitteltem Keyword'}, und erweitere den Text um 3-5 relevante FAQs im Format "**Frage:** ...\n**Antwort:** ..." um für AI-Overviews und Featured Snippets zu optimieren. Gib nur den erweiterten Text mit FAQs zurück, ohne Erklärungen:\n\n${text}`,
}

export async function optimizeText(text, settings) {
  const level = settings?.textLevel || 0

  // L0: Text unverändert zurückgeben
  if (level === 0 || !text || text.trim() === '') return text

  const promptFn = LEVEL_PROMPTS[level]
  if (!promptFn) return text

  const persona = settings?.textPersona || ''
  const keyword = settings?.textKeyword || ''

  let prompt
  if (level <= 2) prompt = promptFn(text)
  else if (level === 3) prompt = promptFn(text, persona)
  else prompt = promptFn(text, persona, keyword)

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

    if (!response.ok) return text

    const data = await response.json()
    return data.content?.[0]?.text?.trim() || text

  } catch {
    // Bei Fehler: Original-Text zurückgeben
    return text
  }
}
