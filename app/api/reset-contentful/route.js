// Contentful-spezifische Reset-Route
// Löscht alle Entries und Content Types im Space
// Für andere Zielsysteme: reset-{system}/route.js anlegen

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'
    const results = { entriesDeleted: 0, contentTypesDeleted: 0, errors: [] }

    // 1. Alle Entries unpublishen und löschen
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

    // 2. Alle Content Types unpublishen und löschen
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

    return Response.json(results)

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
