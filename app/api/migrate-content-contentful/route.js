// Contentful-spezifische Route zum Migrieren von redaktionellem Content
// Unterstützt zwei Quellformate:
//   - Shopify-Pages: { pages: [...] }  → direkte Migration mit title/slug/body
//   - CSV-Rows:      { rows, contentCols, settings, target }
import { optimizeCSVRow } from '../../../lib/pipeline/text-optimizer.js'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    // ── Shopify-Pages-Pfad ──────────────────────────────────────────
    if (body.pages) {
      const { pages } = body

      if (!pages || pages.length === 0) {
        return Response.json({ error: 'Keine Pages übergeben' }, { status: 400 })
      }

      // Content Type aus Contentful holen
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

      const titleField = fields.find(f => ['title', 'titel', 'name', 'seitentitel'].some(k => f.id.toLowerCase().includes(k)))
      const slugField  = fields.find(f => ['slug', 'uid', 'url', 'handle'].some(k => f.id.toLowerCase().includes(k)))
      const bodyField  = fields.find(f => ['body', 'content', 'inhalt', 'description', 'seiteninhalt'].some(k => f.id.toLowerCase().includes(k)))

      const results = []

       for (const page of pages) {
    try {
      const entryFields = {}
      if (titleField) entryFields[titleField.id] = { 'en-US': page.title }
      if (slugField)  entryFields[slugField.id]  = { 'en-US': page.handle }
      if (bodyField) {
        const isRichText = bodyField.type === 'RichText'
        if (isRichText) {
          const richTextValue = {
            nodeType: 'document',
            data: {},
            content: [{
              nodeType: 'paragraph',
              data: {},
              content: [{
                nodeType: 'text',
                value: page.body_html ? page.body_html.replace(/<[^>]*>/g, '') : '',
                marks: [],
                data: {}
              }]
            }]
          }
        entryFields[bodyField.id] = { 'en-US': richTextValue }
      } else {
        entryFields[bodyField.id] = { 'en-US': page.body_html || '' }
      }
    }
              entryFields[bodyField.id] = { 'de-DE': richTextValue, 'en-US': richTextValue }
            } else {
              entryFields[bodyField.id] = { 'de-DE': page.body_html || '', 'en-US': page.body_html || '' }
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
            results.push({ status: 'error', title: page.title, error: data.message || JSON.stringify(data.details) || 'Fehler' })          }
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

    const titleField = fields.find(f => ['title', 'titel', 'name'].some(k => f.id.toLowerCase().includes(k)))
    const slugField  = fields.find(f => ['slug', 'uid', 'url', 'handle'].some(k => f.id.toLowerCase().includes(k)))
    const bodyField  = fields.find(f => ['body', 'content', 'inhalt', 'description'].some(k => f.id.toLowerCase().includes(k)))

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

        if (titleField) entryFields[titleField.id] = { 'en-US': titleValue }
        if (slugField)  entryFields[slugField.id]  = { 'en-US': slugValue }
        if (bodyField)  entryFields[bodyField.id]  = { 'en-US': bodyValue }

        for (const field of fields) {
          if (entryFields[field.id]) continue
          const matchingCol = columns.find(c => c.toLowerCase() === field.id.toLowerCase())
          if (matchingCol && optimized[matchingCol]) {
            entryFields[field.id] = { 'en-US': optimized[matchingCol].toString() }
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
