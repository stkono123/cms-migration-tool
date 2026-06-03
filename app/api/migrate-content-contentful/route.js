// Contentful-spezifische Route zum Migrieren von redaktionellem Content
// Aktuell: Pages aus Shopify nach Contentful
// Für andere Zielsysteme: migrate-content-{system}/route.js anlegen

import { optimizeCSVRow } from '../../../lib/pipeline/text-optimizer.js'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { rows, contentCols, settings, target } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Rows übergeben' }, { status: 400 })
    }

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

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

    // Felder mappen
    const titleField = fields.find(f => f.id.toLowerCase().includes('title') || f.id.toLowerCase().includes('titel') || f.id.toLowerCase().includes('name'))
    const slugField = fields.find(f => f.id.toLowerCase().includes('slug') || f.id.toLowerCase().includes('uid') || f.id.toLowerCase().includes('url'))
    const bodyField = fields.find(f => f.id.toLowerCase().includes('body') || f.id.toLowerCase().includes('content') || f.id.toLowerCase().includes('label') || f.id.toLowerCase().includes('description'))

    // Spalten aus den Rows ermitteln
    const columns = Object.keys(rows[0])
    const titleCol = columns.find(c => ['title', 'name', 'label', 'headline', 'uid'].some(k => c.toLowerCase().includes(k))) || columns[1]
    const slugCol = columns.find(c => ['uid', 'slug', 'handle', 'url', 'path'].some(k => c.toLowerCase().includes(k))) || columns[0]
    const bodyCol = columns.find(c => ['description', 'body', 'content', 'text', 'label'].some(k => c.toLowerCase().includes(k)))

    const results = []
    const migrationLog = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Text optimieren
        const { optimized, log } = await optimizeCSVRow(row, contentCols, settings)
        if (log.length > 0) migrationLog.push({ index: i, entries: log })

        // Entry-Felder aufbauen
        const entryFields = {}
        const titleValue = optimized[titleCol] || `Eintrag ${i + 1}`
        const slugValue = (optimized[slugCol] || `entry-${i}`).toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const bodyValue = bodyCol ? (optimized[bodyCol] || '') : ''

        if (titleField) entryFields[titleField.id] = { 'en-US': titleValue }
        if (slugField) entryFields[slugField.id] = { 'en-US': slugValue }
        if (bodyField) entryFields[bodyField.id] = { 'en-US': bodyValue }

        // Alle übrigen Felder aus den CSV-Spalten befüllen
        for (const field of fields) {
          if (entryFields[field.id]) continue
          const matchingCol = columns.find(c => c.toLowerCase() === field.id.toLowerCase())
          if (matchingCol && optimized[matchingCol]) {
            entryFields[field.id] = { 'en-US': optimized[matchingCol].toString() }
          }
        }

        // Nach Contentful schreiben
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
    const encodingFixed = migrationLog.flatMap(l => l.entries).filter(e => e.action === 'encoding_fixed').length
    const enhanced = migrationLog.flatMap(l => l.entries).filter(e => e.action?.startsWith('l')).length

    return Response.json({
      results,
      summary: {
        total: rows.length,
        success: successCount,
        errors: rows.length - successCount,
        encodingFixed,
        enhanced,
      },
      migrationLog,
      contentTypeUsed: contentTypeId,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
