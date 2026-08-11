import JSZip from 'jszip'

export const runtime = 'nodejs'
export const maxDuration = 120

// Identical to analyze-url so both channels behave consistently.
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

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : null
}

export async function POST(request) {
  try {
    const { base64, fileName } = await request.json()
    if (!base64) {
      return Response.json({ error: 'Keine ZIP-Datei übergeben' }, { status: 400 })
    }

    const zip = await JSZip.loadAsync(base64, { base64: true })

    // Collect HTML entries, skip macOS metadata folders and hidden files.
    const htmlEntries = []
    zip.forEach((relativePath, file) => {
      if (file.dir) return
      if (relativePath.startsWith('__MACOSX') || /\/\./.test(relativePath)) return
      if (/\.(html?)$/i.test(relativePath)) {
        htmlEntries.push({ path: relativePath, file })
      }
    })

    if (htmlEntries.length === 0) {
      return Response.json({ error: 'Keine HTML-Dateien im ZIP gefunden' }, { status: 400 })
    }

    // Process up to 20 files to keep the Claude prompt manageable.
    const limit = Math.min(htmlEntries.length, 20)
    const pageTexts = []
    const allAssetUrls = []

    for (let i = 0; i < limit; i++) {
      const { path, file } = htmlEntries[i]
      const html = await file.async('string')
      const title = extractTitle(html) || path.replace(/.*\//, '').replace(/\.html?$/i, '')
      const { text, assetUrls } = stripHtml(html)
      allAssetUrls.push(...assetUrls)
      pageTexts.push({ path, title, text: text.slice(0, 3000) })
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
          content: `Analysiere diese HTML-Seiten aus einem ZIP-Archiv. Erkenne fuer jede Seite Titel, kurze Inhaltsbeschreibung, Seitentyp und ob sie einen CTA enthaelt.

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

    // Merge Claude's analysis back with the original file paths/titles as fallback.
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

    // Fall back to raw extraction if Claude returned no pages.
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
      fileCount: htmlEntries.length,
      columns: ['fileName', 'pageTitle', 'body', 'sectionType', 'hasCTA'],
      detectedContentCols: ['pageTitle', 'body'],
      detectedCommerceCols: [],
      hasCommerce: false,
      hasContent: true,
      productCount: 0,
      pages: pages.slice(0, 5),         // preview shown in UI
      allPages: pages,                   // full list used by migration
      totalContentRows: pages.length,
      blogs: [],
      metafields: [],
      metafieldSources: { shop: 0, product: 0 },
      totalRows: pages.length,
      assetUrls: allAssetUrls.slice(0, 50),
      suggestedContentType: parsed.suggestedContentType || 'WebPage',
    }

    return Response.json(inventory)
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
