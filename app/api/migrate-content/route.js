export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { pages } = await request.json()

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    // 1. Alle Content Types aus Contentful holen
    const ctRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const ctData = await ctRes.json()
    const contentTypes = ctData.items || []

    // 2. Den passenden Page Content Type finden
    // Suche nach ID oder Name die "page", "seite", "static" enthält
    const pageContentType = contentTypes.find(ct =>
      ct.sys.id.toLowerCase().includes('page') ||
      ct.sys.id.toLowerCase().includes('seite') ||
      ct.sys.id.toLowerCase().includes('static') ||
      ct.name?.toLowerCase().includes('seite') ||
      ct.name?.toLowerCase().includes('page')
    )

    if (!pageContentType) {
      return Response.json({ error: 'Kein passender Page Content Type gefunden', availableTypes: contentTypes.map(ct => ct.sys.id) }, { status: 400 })
    }

    const contentTypeId = pageContentType.sys.id
    const fields = pageContentType.fields || []

    // 3. Felder mappen
    const titleField = fields.find(f => f.id.toLowerCase().includes('title') || f.id.toLowerCase().includes('titel'))
    const slugField = fields.find(f => f.id.toLowerCase().includes('slug') || f.id.toLowerCase().includes('url'))
    const bodyField = fields.find(f => f.type === 'RichText' || f.id.toLowerCase().includes('body') || f.id.toLowerCase().includes('content') || f.id.toLowerCase().includes('inhalt'))
    const seoTitleField = fields.find(f => f.id.toLowerCase().includes('seo') && f.id.toLowerCase().includes('title'))

    const results = []

    // 4. Pages migrieren
    for (const page of pages) {
      try {
        const entryFields = {}

        if (titleField) entryFields[titleField.id] = { 'en-US': page.title }
        if (slugField) entryFields[slugField.id] = { 'en-US': page.handle || page.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }
        if (bodyField) {
          if (bodyField.type === 'RichText') {
            entryFields[bodyField.id] = {
              'en-US': {
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
            }
          } else {
            entryFields[bodyField.id] = { 'en-US': page.body_html ? page.body_html.replace(/<[^>]*>/g, '') : '' }
          }
        }
        if (seoTitleField) entryFields[seoTitleField.id] = { 'en-US': page.title }

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
          results.push({ title: page.title, status: 'success' })
        } else {
          results.push({ title: page.title, status: 'error', error: data.message || data.details || 'Unbekannter Fehler' })
        }
      } catch (e) {
        results.push({ title: page.title, status: 'error', error: e.message })
      }
    }

    return Response.json({ results, contentTypeUsed: contentTypeId })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
