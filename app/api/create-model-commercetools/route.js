// commercetools-spezifische Route zum Anlegen von Product Types
// Für andere Zielsysteme: create-model-{system}/route.js anlegen

export const runtime = 'nodejs'

// Umlaut-sichere Normalisierung für CT-Attributnamen
// Konsistent mit migrate-products-commercetools/route.js
const normalizeAttrName = (name) => name
  .toLowerCase()
  .replace(/ä/g, 'a')
  .replace(/ö/g, 'o')
  .replace(/ü/g, 'u')
  .replace(/ß/g, 'ss')
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_]/g, '')

export async function POST(request) {
  try {
    const { contentTypes } = await request.json()

    const projectKey = process.env.CT_PROJECT_KEY
    const clientId = process.env.CT_CLIENT_ID
    const clientSecret = process.env.CT_CLIENT_SECRET
    const authUrl = process.env.CT_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com'
    const apiUrl = process.env.CT_API_URL || 'https://api.europe-west1.gcp.commercetools.com'

    // Auth Token holen
    const authResponse = await fetch(`${authUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: `grant_type=client_credentials&scope=manage_products:${projectKey}`
    })

    const authData = await authResponse.json()
    if (!authResponse.ok) {
      return Response.json({ error: 'Auth fehlgeschlagen', details: authData }, { status: 500 })
    }

    const accessToken = authData.access_token
    const results = []

    for (const ct of contentTypes) {
      try {
        const attributes = ct.fields.map(f => ({
          // FIX: Attributnamen normalisieren damit Umlaute und Sonderzeichen CT nicht blockieren
          name: normalizeAttrName(f.id),
          label: { de: f.name, 'en-US': f.name },
          isRequired: false,
          type: mapFieldType(f.type),
          attributeConstraint: 'None',
          isSearchable: true,
          inputHint: 'SingleLine'
        }))

        const res = await fetch(`${apiUrl}/${projectKey}/product-types`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: ct.name,
            description: ct.description || ct.name,
            attributes
          })
        })

        const data = await res.json()

        if (res.ok) {
          results.push({ id: ct.id, name: ct.name, status: 'success', ctId: data.id })
        } else {
          results.push({ id: ct.id, name: ct.name, status: 'error', error: data.message || data.errors?.[0]?.message || 'Fehler' })
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

function mapFieldType(type) {
  switch (type) {
    case 'Boolean': return { name: 'boolean' }
    case 'Integer': return { name: 'number', numberType: 'integer' }
    case 'Date': return { name: 'datetime' }
    case 'RichText':
    case 'Text': return { name: 'ltext' }
    default: return { name: 'text' }
  }
}
