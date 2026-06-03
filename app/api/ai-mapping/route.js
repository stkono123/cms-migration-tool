// Generische AI-Mapping Route
// Zielsysteme und Prompt kommen aus dem jeweiligen Quellsystem-Adapter
// Unterstützte Quellsysteme aktuell: shopify

export const runtime = 'nodejs'

import { buildMappingPrompt as buildShopifyPrompt } from '../../../lib/adapters/shopify/ai-prompt.js'
import { buildMappingPrompt as buildCSVPrompt } from '../../../lib/adapters/csv/ai-prompt.js'

export async function POST(request) {
  try {
    const { inventory, targets = ['commercetools', 'Contentful'], csvTarget } = await request.json()
    if (!inventory) {
      return Response.json({ error: 'Kein Inventar übergeben. Bitte zuerst die Analyse ausführen.' }, { status: 400 })
    }

    // Prompt aus Quellsystem-Adapter holen
    // Später: dynamisch anhand von inventory.source wählen
   
    const prompt = inventory.source === 'csv'
      ? buildCSVPrompt(inventory, targets, csvTarget)
      : buildShopifyPrompt(inventory, targets)
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const responseText = await response.text()

    if (!response.ok) {
      return Response.json({
        error: `Anthropic Error ${response.status}`,
        details: responseText
      }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const text = data.content[0].text

    // Robustes JSON-Parsing
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')

    if (firstBrace === -1 || lastBrace === -1) {
      return Response.json({ error: 'Kein JSON in der KI-Antwort gefunden', raw: text }, { status: 500 })
    }

    const parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1))
    return Response.json(parsed)

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
