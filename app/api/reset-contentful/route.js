// Contentful-spezifische Reset-Route
// target: 'content' → nur Entries löschen
// target: 'model'   → nur Content Types löschen
// target: 'all'     → beides (Fallback für alte Aufrufe ohne target)

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const target = body.target ?? 'all'

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'
    const results = { entriesDeleted: 0, contentTypesDeleted: 0, errors: [] }

    // 1. Entries löschen (wenn target 'content' oder 'all')
    if (target === 'content' || target === 'all') {
      const entriesRes = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries?limit=1000`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const entriesData = await entriesRes.json()

      for (const entry of entriesData.items || []) {
        try {
          if (entry.sys.publishedVersion) {
            await fetch(
              `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${entry.sys.id}/published`,
              { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
            )
          }
          await fetch(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${entry.sys.id}`,
            { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
          )
          results.entriesDeleted++
        } catch (e) {
          results.errors.push(`Entry ${entry.sys.id}: ${e.message}`)
        }
      }
    }

    // 2. Content Types löschen (wenn target 'model' oder 'all')
    if (target === 'model' || target === 'all') {
      const ctRes = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=1000`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const ctData = await ctRes.json()

      for (const ct of ctData.items || []) {
        try {
          if (ct.sys.publishedVersion) {
            await fetch(
              `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${ct.sys.id}/published`,
              { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
            )
          }
          await fetch(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${ct.sys.id}`,
            { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
          )
          results.contentTypesDeleted++
        } catch (e) {
          results.errors.push(`ContentType ${ct.sys.id}: ${e.message}`)
        }
      }
    }

    return Response.json(results)

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
