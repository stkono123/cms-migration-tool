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
        // Content Type anlegen
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
              fields: ct.fields.map(f => ({
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
            })
          }
        )

        const data = await res.json()

        if (res.ok) {
          // Content Type publishen
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
          results.push({ id: ct.id, name: ct.name, status: 'error', error: data.message })
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
