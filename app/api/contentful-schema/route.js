// Temporäre Hilfsroute: gibt das vollständige Contentful Content Model zurück
// (alle Content Types mit allen Feldern und Validierungen)
// Geschützt durch die globale Basic Auth Middleware.

export const runtime = 'nodejs'

export async function GET() {
  try {
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'

    const res = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=200&order=name`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: data }, { status: res.status })
    }

    // Nur die relevanten Felder zurückgeben (kein internes sys-Rauschen)
    const schema = (data.items || []).map(ct => ({
      id: ct.sys.id,
      name: ct.name,
      description: ct.description,
      displayField: ct.displayField,
      fields: (ct.fields || []).map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        linkType: f.linkType,
        required: f.required,
        localized: f.localized,
        validations: f.validations,
        items: f.items,
      }))
    }))

    return Response.json({ total: schema.length, contentTypes: schema })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
