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

      const titleField = fields.find(f => ['title', 'titel', 'name'].some(k => f.id.toLowerCase().includes(k)))
      const slugField  = fields.find(f => ['slug', 'uid', 'url', 'handle'].some(k => f.id.toLowerCase().includes(k)))
      const bodyField  = fields.find(f => ['body', 'content', 'inhalt', 'description'].some(k => f.id.toLowerCase().includes(k)))

      const results = []

      for (const page of pages) {
        try {
          const entryFields = {}
          if (titleField) entryFields[titleField.id] = { 'de-DE': page.title, 'en-US': page.title }
          if (slugField)  entryFields[slugField.id]  = { 'de-DE': page.handle, 'en-US': page.handle }
          if (bodyField)  entryFields[bodyField.id]  = { 'de-DE': page.body_html || '', 'en-US': page.body_html || '' }

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
            results.push({ status: 'error', title: page.title, error: data.message || 'Fehler' })
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
        error: 'Kein passender Conte
