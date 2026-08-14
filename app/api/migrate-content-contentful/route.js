// Contentful-spezifische Route zum Migrieren von redaktionellem Content
// Unterstützt zwei Quellformate:
//   - Shopify-Pages: { pages: [...] }  → direkte Migration mit title/slug/body
//   - CSV-Rows:      { rows, contentCols, settings, target }
import { optimizeCSVRow, optimizeText } from '../../../lib/pipeline/text-optimizer.js'

function extractPlainText(doc) {
  if (!doc?.content) return ''
  const parts = []
  function walk(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 'text') parts.push(node.value)
      else if (node.content) walk(node.content)
    }
  }
  walk(doc.content)
  return parts.join(' ')
}

function buildRichTextFromString(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  return {
    nodeType: 'document',
    data: {},
    content: (paragraphs.length ? paragraphs : [text]).map(p => ({
      nodeType: 'paragraph',
      data: {},
      content: [{ nodeType: 'text', value: p.trim(), marks: [], data: {} }]
    }))
  }
}

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    // Locales einmal abfragen
    const localeRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const defaultLocale = (localeData.items || []).find(l => l.default)?.code || 'en-US'

    // ── Shopify-Pages-Pfad ──────────────────────────────────────────
    if (body.pages) {
      const { pages, settings } = body

      if (!pages || pages.length === 0) {
        return Response.json({ error: 'Keine Pages übergeben' }, { status: 400 })
      }

      const ctRes = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const ctData = await ctRes.json()
      const contentTypes = ctData.items || []

      const pageContentType = contentTypes.find(ct =>
        ct.sys.id.toLowerCase().includes('page') ||
        ct.sys.id.toLowerCase().includes('seite') ||
        ct.name?.toLowerCase().includes('page') ||
        ct.name?.toLowerCase().includes('seite')
      )

      if (!pageContentType) {
        return Response.json({
          error: 'Kein passender Content Type gefunden',
          availableTypes: contentTypes.map(ct => ct.sys.id)
        }, { status: 400 })
      }

      const contentTypeId = pageContentType.sys.id
      const fields = pageContentType.fields || []

      const titleField = fields.find(f => f.id === pageContentType.displayField)
        || fields.find(f => ['title', 'titel', 'name'].some(k => f.id.toLowerCase().includes(k)))
      const slugField  = fields.find(f => ['slug', 'uid', 'url', 'handle'].some(k => f.id.toLowerCase().includes(k)))
      const bodyField  = fields.find(f => f.type === 'RichText' || f.type === 'Text')
        || fields.find(f => ['body', 'content', 'inhalt', 'description'].some(k => f.id.toLowerCase().includes(k)))
      
      const results = []

      for (const page of pages) {
        try {
          const entryFields = {}
          if (titleField) entryFields[titleField.id] = { [defaultLocale]: page.title }
          if (slugField)  entryFields[slugField.id]  = { [defaultLocale]: page.handle }
          if (bodyField) {
            const isRichText = bodyField.type === 'RichText'
            const rawBody = page.body_html ?? page.body ?? ''
          
            const plainText = rawBody && typeof rawBody === 'object' && rawBody.nodeType === 'document'
              ? extractPlainText(rawBody)
              : typeof rawBody === 'string' ? rawBody.replace(/<[^>]*>/g, '') : ''
          
            const optimizedText = settings?.textLevel > 0
              ? await optimizeText(plainText, settings)
              : null
          
            if (isRichText) {
              const richTextValue = optimizedText
                ? buildRichTextFromString(optimizedText)
                : rawBody && typeof rawBody === 'object' && rawBody.nodeType === 'document'
                  ? rawBody
                  : buildRichTextFromString(plainText)
              entryFields[bodyField.id] = { [defaultLocale]: richTextValue }
            } else {
              entryFields[bodyField.id] = { [defaultLocale]: optimizedText || plainText }
            }
          }
          const res = await fetch(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/vnd.contentful.management.v1+json',
                'X-Contentful-Content-Type': contentTypeId
              },
              body: JSON.stringify({ fields: entryFields })
            }
          )
          const data = await res.json()
          if (res.ok) {
            results.push({ status: 'success', title: page.title })
          } else {
            console.error('CF Entry Error:', JSON.stringify(data))
            results.push({ status: 'error', title: page.title, error: data.message || JSON.stringify(data.details) || 'Fehler' })
          }
        } catch (e) {
          results.push({ status: 'error', title: page.title || 'Unbekannt', error: e.message })
        }
      }

      return Response.json({
        results,
        summary: {
          total: pages.length,
          success: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
        }
      })
    }

    // ── CSV-Rows-Pfad ───────────────────────────────────────────────
    const { rows, contentCols, settings, target } = body

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Rows übergeben' }, { status: 400 })
    }

    const ctRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const ctData = await ctRes.json()
    const contentTypes = ctData.items || []

    const pageContentType = contentTypes.find(ct =>
      ct.sys.id.toLowerCase().includes('page') ||
      ct.sys.id.toLowerCase().includes('seite') ||
      ct.name?.toLowerCase().includes('page') ||
      ct.name?.toLowerCase().includes('seite')
    )

    if (!pageContentType) {
      return Response.json({
        error: 'Kein passender Content Type gefunden',
        availableTypes: contentTypes.map(ct => ct.sys.id)
      }, { status: 400 })
    }

    const contentTypeId = pageContentType.sys.id
    const fields = pageContentType.fields || []

    const titleField = fields.find(f => f.id === pageContentType.displayField)
      || fields.find(f => ['title', 'titel', 'name'].some(k => f.id.toLowerCase().includes(k)))
    const slugField  = fields.find(f => ['slug', 'uid', 'url', 'handle'].some(k => f.id.toLowerCase().includes(k)))
    const bodyField  = fields.find(f => f.type === 'RichText' || f.type === 'Text')
      || fields.find(f => ['body', 'content', 'inhalt', 'description'].some(k => f.id.toLowerCase().includes(k)))

    const columns = Object.keys(rows[0])
    const titleCol = columns.find(c => ['title', 'name', 'label', 'headline'].some(k => c.toLowerCase().includes(k))) || columns[1]
    const slugCol  = columns.find(c => ['uid', 'slug', 'handle', 'url'].some(k => c.toLowerCase().includes(k))) || columns[0]
    const bodyCol  = columns.find(c => ['description', 'body', 'content', 'text'].some(k => c.toLowerCase().includes(k)))

    const results = []
    const migrationLog = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const { optimized, log } = await optimizeCSVRow(row, contentCols, settings)
        if (log.length > 0) migrationLog.push({ index: i, entries: log })

        const entryFields = {}
        const titleValue = optimized[titleCol] || `Eintrag ${i + 1}`
        const slugValue = (optimized[slugCol] || `entry-${i}`).toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const bodyValue = bodyCol ? (optimized[bodyCol] || '') : ''

        if (titleField) entryFields[titleField.id] = { [defaultLocale]: titleValue }
        if (slugField)  entryFields[slugField.id]  = { [defaultLocale]: slugValue }
        if (bodyField)  entryFields[bodyField.id]  = { [defaultLocale]: bodyValue }

        for (const field of fields) {
          if (entryFields[field.id]) continue
          const matchingCol = columns.find(c => c.toLowerCase() === field.id.toLowerCase())
          if (matchingCol && optimized[matchingCol]) {
            entryFields[field.id] = { [defaultLocale]: optimized[matchingCol].toString() }
          }
        }

        const res = await fetch(
          `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/vnd.contentful.management.v1+json',
              'X-Contentful-Content-Type': contentTypeId
            },
            body: JSON.stringify({ fields: entryFields })
          }
        )
        const data = await res.json()
        if (res.ok) {
          results.push({ index: i, status: 'success', title: titleValue })
        } else {
          console.error('CF Entry Error:', JSON.stringify(data))
          results.push({ index: i, status: 'error', title: titleValue, error: data.message || 'Fehler' })
        }
      } catch (e) {
        results.push({ index: i, status: 'error', title: `Eintrag ${i + 1}`, error: e.message })
        migrationLog.push({ index: i, entries: [{ action: 'error', error: e.message }] })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    return Response.json({
      results,
      summary: {
        total: rows.length,
        success: successCount,
        errors: rows.length - successCount,
        encodingFixed: migrationLog.flatMap(l => l.entries).filter(e => e.action === 'encoding_fixed').length,
        enhanced: migrationLog.flatMap(l => l.entries).filter(e => e.action?.startsWith('l')).length,
      },
      migrationLog,
      contentTypeUsed: contentTypeId,
    })

  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
