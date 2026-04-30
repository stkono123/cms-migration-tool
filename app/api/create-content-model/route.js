export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { contentTypes } = await request.json()

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    const results = []

    for (const ct of contentTypes) {
      try {
        const fields = ct.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type === 'RichText' ? 'RichText' :
                f.type === 'Asset' ? 'Link' :
                f.type === 'Link' ? 'Link' :
                f.type === 'Integer' ? 'Integer' :
                f.type === 'Boolean' ? 'Boolean' :
                f.type === 'Date' ? 'Date' :
                f.type === 'Text' ? 'Text' : 'Symbol',
          linkType: f.type === 'Asset' ? 'Asset' :
                    f.type === 'Link' ? 'Entry' : undefined,
          required: f.required || false,
          localized: false,
          disabled: false,
          omitted: false,
          validations: []
        }))

        // Title Feld finden
        const titleFieldId = ct.fields.find(f =>
          f.id.toLowerCase().includes('title') ||
          f.id.toLowerCase().includes('titel') ||
          f.id.toLowerCase().includes('name')
        )?.id || ct.fields[0]?.id

        const res = await fetch(
          `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${ct.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: ct.name,
              description: ct.description,
              displayField: titleFieldId,
              fields
            })
          }
        )

        const data = await res.json()

        if (res.ok) {
          await fetch(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types/${ct.id}/published`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Contentful-Version': data.sys.version
              }
            }
          )
          results.push({ id: ct.id, name: ct.name, status: 'success' })
        } else {
          results.push({ id: ct.id, name: ct.name, status: 'error', error: data.message || data.details || 'Fehler' })
        }
      } catch (e) {
        results.push({ id: ct.id, name: ct.name, status: 'error', error: e.message })
      }
    }

    return Response.json({ results })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
