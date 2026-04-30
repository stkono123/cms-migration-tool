export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { inventory } = await request.json()

    const prompt = `Du bist ein MACH-Architektur-Experte. Analysiere diese Shopify-Struktur und verteile die Inhalte optimal auf zwei Zielsysteme: commercetools (Commerce-Daten) und Contentful (Content-Daten).

SHOPIFY INVENTAR:
- Shop: ${inventory.shopName}
- Produkte: ${inventory.productCount}
- Pages (${inventory.pages.length}): ${inventory.pages.map(p => p.title).join(', ')}
- Blogs (${inventory.blogs.length}): ${inventory.blogs.map(b => b.title).join(', ')}
- Metafields (${inventory.metafields.length}): ${inventory.metafields.slice(0, 20).map(m => `${m.namespace}.${m.key}`).join(', ')}

REGELN FÜR DIE VERTEILUNG:
- commercetools: Produkte, Kategorien, Preise, Inventar, Bestellungen, Kundendaten
- Contentful: Pages, Blogs, redaktionelle Inhalte, Marketing-Texte, Metafield-Inhalte die nicht commerce-relevant sind

WICHTIG für Namen: Verwende EXAKT die Namen aus dem Shopify-Inventar. Erfinde keine neuen Namen.

Antworte NUR mit folgendem JSON-Format ohne Markdown oder Backticks:
{
  "summary": "Kurze Zusammenfassung der MACH-Architektur auf Deutsch",
  "commercetools": {
    "description": "Was nach commercetools migriert wird",
    "contentTypes": [
      {
        "id": "eindeutige_id",
        "name": "Name exakt aus Shopify",
        "description": "Beschreibung",
        "sourceType": "Shopify-Quelle",
        "fields": [
          { "id": "field_id", "name": "Feldname", "type": "String", "required": true }
        ],
        "estimatedEntries": 0
      }
    ]
  },
  "contentful": {
    "description": "Was nach Contentful migriert wird",
    "contentTypes": [
      {
        "id": "eindeutige_id",
        "name": "Name exakt aus Shopify",
        "description": "Beschreibung",
        "sourceType": "Shopify-Quelle",
        "fields": [
          { "id": "field_id", "name": "Feldname", "type": "Symbol", "required": true }
        ],
        "estimatedEntries": 0
      }
    ]
  },
  "migrationSteps": ["Schritt 1", "Schritt 2"]
}`

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
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return Response.json(parsed)

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
