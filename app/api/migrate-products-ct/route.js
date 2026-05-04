export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { limit = 10 } = await request.json()

    const shopifyDomain = process.env.SHOPIFY_DOMAIN
    const shopifyToken = process.env.SHOPIFY_ADMIN_TOKEN
    const ctProjectKey = process.env.CT_PROJECT_KEY
    const ctClientId = process.env.CT_CLIENT_ID
    const ctClientSecret = process.env.CT_CLIENT_SECRET
    const ctAuthUrl = process.env.CT_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com'
    const ctApiUrl = process.env.CT_API_URL || 'https://api.europe-west1.gcp.commercetools.com'

    // 1. Shopify Produkte laden
    const shopifyRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=${Math.min(limit, 250)}&status=active`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json'
        }
      }
    )
    const shopifyData = await shopifyRes.json()
    const products = shopifyData.products || []

    if (products.length === 0) {
      return Response.json({ error: 'Keine Produkte in Shopify gefunden' }, { status: 400 })
    }

    // 2. CT Auth Token holen
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

    // 3. CT Product Type holen (erster vorhandener)
    const ptRes = await fetch(`${ctApiUrl}/${ctProjectKey}/product-types?limit=1`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const ptData = await ptRes.json()
    const productType = ptData.results?.[0]

    if (!productType) {
      return Response.json({ error: 'Kein Product Type in commercetools gefunden. Bitte zuerst das Model anlegen.' }, { status: 400 })
    }

    // 4. Produkte nach CT migrieren
    const results = []

    for (const product of products) {
      try {
        const slug = product.handle || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const price = product.variants?.[0]?.price
          ? Math.round(parseFloat(product.variants[0].price) * 100)
          : 0

        const ctProduct = {
          productType: { id: productType.id, typeId: 'product-type' },
          name: { de: product.title, 'en-US': product.title },
          slug: { de: slug, 'en-US': slug },
          description: product.body_html
            ? { de: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) }
            : undefined,
          masterVariant: {
            sku: product.variants?.[0]?.sku || `shopify-${product.id}`,
            prices: price > 0 ? [{
              value: { currencyCode: 'EUR', centAmount: price, type: 'centPrecision', fractionDigits: 2 }
            }] : [],
            images: product.images?.[0] ? [{
              url: product.images[0].src,
              dimensions: { w: product.images[0].width || 800, h: product.images[0].height || 800 },
              label: product.title
            }] : [],
            attributes: [
              { name: 'shopifyId', value: String(product.id) },
              { name: 'vendor', value: product.vendor || '' },
            ].filter(a => {
              return productType.attributes?.some(pa => pa.name === a.name)
            })
          },
          variants: product.variants?.slice(1).map((v, i) => ({
            sku: v.sku || `shopify-${product.id}-${i + 1}`,
            prices: v.price ? [{
              value: { currencyCode: 'EUR', centAmount: Math.round(parseFloat(v.price) * 100), type: 'centPrecision', fractionDigits: 2 }
            }] : [],
            attributes: []
          })) || [],
          categories: [],
          publish: true
        }

        const res = await fetch(`${ctApiUrl}/${ctProjectKey}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ctProduct)
        })

        const data = await res.json()

        if (res.ok) {
          results.push({ name: product.title, status: 'success', ctId: data.id })
        } else {
          results.push({ name: product.title, status: 'error', error: data.message || data.errors?.[0]?.message || JSON.stringify(data.errors) })
        }
      } catch (e) {
        results.push({ name: product.title, status: 'error', error: e.message })
      }
    }

    return Response.json({ results, total: products.length })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
