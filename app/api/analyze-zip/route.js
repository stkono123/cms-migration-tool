export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  try {
    const { pageTexts, fileName } = await request.json()

    if (!pageTexts || pageTexts.length === 0) {
      return Response.json({ error: 'Keine HTML-Inhalte übergeben' }, { status: 400 })
    }

    const pagesBlock = pageTexts
      .map((p, i) => `--- Datei ${i + 1}: ${p.path} ---\nTitel: ${p.title}\nText: ${p.text}`)
      .join('\n\n')

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analysiere diese HTML-Seiten. Erkenne fuer jede Seite Titel, kurze Inhaltsbeschreibung, Seitentyp und ob sie einen CTA enthaelt.

Gib ein JSON-Objekt zurueck — kein Text davor oder danach, nur JSON:
{
  "siteName": "Name der Website oder des Projekts",
  "pages": [
    {
      "fileName": "index.html",
      "pageTitle": "Seitentitel",
      "body": "Kurze Inhaltszusammenfassung (max 2 Saetze)",
      "sectionType": "Landing Page",
      "hasCTA": true
    }
  ],
  "suggestedContentType": "LandingPage"
}

${pagesBlock}`,
        }],
      }),
    })

    const aiData = await aiRes.json()
    const raw = aiData.content?.[0]?.text || '{}'
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(raw.slice(start, end + 1))

    const pages = (parsed.pages || []).map((p, i) => ({
      id: `zip-${i}`,
      fileName: p.fileName || pageTexts[i]?.path || `file-${i}.html`,
      title: p.pageTitle || pageTexts[i]?.title || `Seite ${i + 1}`,
      pageTitle: p.pageTitle || pageTexts[i]?.title || `Seite ${i + 1}`,
      body: p.body || '',
      sectionType: p.sectionType || 'Page',
      hasCTA: p.hasCTA || false,
      migrationSource: 'zip',
    }))

    if (pages.length === 0) {
      pageTexts.forEach((p, i) => {
        pages.push({
          id: `zip-${i}`,
          fileName: p.path,
          title: p.title,
          pageTitle: p.title,
          body: p.text.slice(0, 300),
          sectionType: 'Page',
          hasCTA: false,
          migrationSource: 'zip',
        })
      })
    }

    const inventory = {
      shopName: parsed.siteName || fileName?.replace(/\.zip$/i, '') || 'ZIP Import',
      source: 'zip',
      fileName: fileName || 'archive.zip',
      fileCount: pageTexts.length,
      columns: ['fileName', 'pageTitle', 'body', 'sectionType', 'hasCTA'],
      detectedContentCols: ['pageTitle', 'body'],
      detectedCommerceCols: [],
      hasCommerce: false,
      hasContent: true,
      productCount: 0,
      pages: pages.slice(0, 5),
      allPages: pages,
      totalContentRows: pages.length,
      blogs: [],
      metafields: [],
      metafieldSources: { shop: 0, product: 0 },
      totalRows: pages.length,
      assetUrls: [],
      suggestedContentType: parsed.suggestedContentType || 'WebPage',
    }

    return Response.json(inventory)
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
