import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function stripHtml(html) {
  const assetUrls = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    assetUrls.push(match[1])
  }
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return { text, assetUrls }
}

export async function POST(request) {
  try {
    const { url } = await request.json()
    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Ungültige URL' }, { status: 400 })
    }

    const fetchRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MigrateIQ/1.0)' }
    })
    if (!fetchRes.ok) {
      return NextResponse.json({ error: `Seite nicht erreichbar: ${fetchRes.status}` }, { status: 400 })
    }
    const html = await fetchRes.text()
    const { text, assetUrls } = stripHtml(html)

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Analysiere diesen Webseitentext und erkenne die semantischen Sektionen (z.B. Hero, Intro, CTA, Features, Testimonials, FAQ, Footer usw.).

Gib ein JSON-Objekt zurück — kein Text davor oder danach, nur JSON:
{
  "pageTitle": "Titel der Seite",
  "sections": [
    {
      "type": "Hero",
      "title": "erkannter Titel oder leer",
      "body": "erkannter Textinhalt",
      "hasCTA": true
    }
  ],
  "suggestedContentType": "LandingPage"
}

Webseitentext:
${text.slice(0, 8000)}`
        }]
      })
    })

    const aiData = await aiRes.json()
    const raw = aiData.content?.[0]?.text || '{}'
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(raw.slice(start, end + 1))

    const pages = (parsed.sections || []).map((s, i) => ({
      id: `section-${i}`,
      title: s.title || s.type || `Sektion ${i + 1}`,
      body: s.body || '',
      sectionType: s.type,
      hasCTA: s.hasCTA || false,
      migrationSource: 'web-fetch',
    }))

    const inventory = {
      shopName: parsed.pageTitle || url,
      source: 'url',
      url,
      columns: ['type', 'title', 'body', 'hasCTA'],
      detectedContentCols: ['title', 'body'],
      detectedCommerceCols: [],
      hasCommerce: false,
      hasContent: true,
      productCount: 0,
      pages: pages.slice(0, 5),
      totalContentRows: pages.length,
      blogs: [],
      metafields: [],
      metafieldSources: { shop: 0, product: 0 },
      totalRows: pages.length,
      assetUrls,
      suggestedContentType: parsed.suggestedContentType || 'WebPage',
    }

    return NextResponse.json(inventory)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
