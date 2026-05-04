export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const ctProjectKey = process.env.CT_PROJECT_KEY
    const ctClientId = process.env.CT_CLIENT_ID
    const ctClientSecret = process.env.CT_CLIENT_SECRET
    const ctAuthUrl = process.env.CT_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com'
    const ctApiUrl = process.env.CT_API_URL || 'https://api.europe-west1.gcp.commercetools.com'

    const results = { productsDeleted: 0, productTypesDeleted: 0, errors: [] }

    // 1. CT Auth Token holen
    const authResponse = await fetch(`${ctAuthUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ctClientId}:${ctClientSecret}`).toString('base64')}`
      },
      body: `grant_type=client_credentials&scope=manage_products:${ctProjectKey} manage_project:${ctProjectKey}`
    })
    const authData = await authResponse.json()
    if (!authResponse.ok) {
      return Response.json({ error: 'CT Auth fehlgeschlagen', details: authData }, { status: 500 })
    }
    const accessToken = authData.access_token

    // 2. Alle Produkte unpublishen und löschen
    const productsRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/products?limit=500`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const productsData = await productsRes.json()

    for (const product of productsData.results || []) {
      try {
        // Unpublishen falls published
        if (product.masterData?.published) {
          await fetch(
            `${ctApiUrl}/${ctProjectKey}/products/${product.id}`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: product.version, actions: [{ action: 'unpublish' }] })
            }
          )
        }
        // Löschen
        const deleteRes = await fetch(
          `${ctApiUrl}/${ctProjectKey}/products/${product.id}?version=${product.version}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        if (deleteRes.ok) results.productsDeleted++
      } catch (e) {
        results.errors.push(`Product ${product.id}: ${e.message}`)
      }
    }

    // 3. Alle Product Types löschen
    const ptRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/product-types?limit=100`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const ptData = await ptRes.json()

    for (const pt of ptData.results || []) {
      try {
        const deleteRes = await fetch(
          `${ctApiUrl}/${ctProjectKey}/product-types/${pt.id}?version=${pt.version}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        if (deleteRes.ok) results.productTypesDeleted++
        else {
          const err = await deleteRes.json()
          results.errors.push(`ProductType ${pt.name}: ${err.message}`)
        }
      } catch (e) {
        results.errors.push(`ProductType ${pt.id}: ${e.message}`)
      }
    }

    return Response.json(results)

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
