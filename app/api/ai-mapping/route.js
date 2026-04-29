export const runtime = 'nodejs'

export async function POST(request) {
  const { inventory } = await request.json()

  const prompt = `Du bist ein CMS-Migrationsexperte. Analysiere diese Shopify-Struktur und schlage ein optimales Contentful Content Model vor.

SHOPIFY INVENTAR:
- Shop: ${inventory.shopName}
- Produkte: ${inventory.productCount}
- Pages (${inventory.pages.length}): ${inventory.pages.map(p => p.title).join(', ')}
- Blogs (${inventory.blogs.length}): ${inventory.blogs.map(b => b.title).join(', ')}
- Metafields (${inventory.metafields.length}): ${inventory.metafields.slice(0, 20).map(m => `${m.namespace}.${m.key} (${m.type || m.value_type || 'string'})`).join(', ')}

Erstelle ein JSON mit folgendem Format:
{
  "summary": "Kurze Zusammenfassung der Migration in 2-3 Sätzen",
  "contentTypes": [
    {
      "id": "eindeutige_id",
      "name": "Content Type Name",
      "description": "Wofür dieser Content Type gedacht ist",
      "sourceType": "Woher die Daten kommen (z.B. Shopify Pages, Blog: News)",
      "fields": [
        { "id": "field_id", "name": "Feldname", "type": "Symbol|Text|RichText|Integer|Boolean|Date|Asset|Link", "required": true }
      ],
      "estimatedEntries": 0
    }
  ],
  "migrationSteps": [
    "Schritt 1: ...",
    "Schritt 2: ..."
  ]
}

Antworte NUR mit dem JSON, ohne Markdown-Backticks oder anderen Text.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content[0].text
    const parsed = JSON.parse(text)
    return Response.json(parsed)

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
