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

    const safeLimit = Math.min(limit, 50)

    // 1. Shopify Produkte laden
    const shopifyRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=${safeLimit}&status=active`,
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

    // 3. CT Product Type "Produkte" holen
    const ptRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/product-types?where=name%3D%22Produkte%22&limit=1`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const ptData = await ptRes.json()
    let productType = ptData.results?.[0]

    if (!productType) {
      const ptAllRes = await fetch(
        `${ctApiUrl}/${ctProjectKey}/product-types?limit=1`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      const ptAllData = await ptAllRes.json()
      productType = ptAllData.results?.[0]
    }

    if (!productType) {
      return Response.json({ error: 'Kein Product Type gefunden. Bitte zuerst das Model anlegen.' }, { status: 400 })
    }

    // 4. Vorhandene Attributnamen aus CT auslesen
    const availableAttributes = new Set(
      (productType.attributes || []).map(a => a.name)
    )

    // 5. Attribute dynamisch mappen
    // WICHTIG: 'name' als Attribut ist das Varianten-Attribut, nicht das CT-Produktname-Feld
    const buildVariantAttributes = (product, variant) => {
      const allMappings = [
        { name: 'product_id',   value: String(product.id) },
        { name: 'shopify_id',   value: String(product.id) },
        { name: 'name',         value: product.title },
        { name: 'titel',        value: product.title },
        { name: 'price',        value: variant?.price ? `${parseFloat(variant.price)} EUR` : '0 EUR (Rezeptpflichtig)' },
        { name: 'preis',        value: variant?.price ? `${parseFloat(variant.price)} EUR` : '0 EUR (Rezeptpflichtig)' },
        { name: 'inventory',    value: String(variant?.inventory_quantity || 0) },
        { name: 'inventar',     value: String(variant?.inventory_quantity || 0) },
        { name: 'lagerbestand', value: String(variant?.inventory_quantity || 0) },
        { name: 'sku',          value: variant?.sku || `shopify-${product.id}-${variant?.id || 'master'}` },
        { name: 'vendor',       value: product.vendor || '' },
        { name: 'hersteller',   value: product.vendor || '' },
        { name: 'category',     value: product.product_type || '' },
        { name: 'kategorie',    value: product.product_type || '' },
        { name: 'tags',         value: product.tags || '' },
        { name: 'status',       value: product.status || 'active' },
      ]

      return allMappings.filter(m => availableAttributes.has(m.name))
    }

    // 6. Bestehende Slugs aus CT laden um Duplikate zu vermeiden
    const existingSlugsRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/products?limit=500&staged=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const existingSlugsData = await existingSlugsRes.json()
    const existingSlugs = new Set(
      (existingSlugsData.results || []).flatMap(p =>
        Object.values(p.masterData?.current?.slug || {})
      )
    )

    // 7. Produkte nach CT migrieren
    const results = []
    const usedSlugs = new Set(existingSlugs)
    const usedSkus = new Set()

    for (const product of products) {
      try {
        // Eindeutigen Slug sicherstellen
        let slug = product.handle || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (usedSlugs.has(slug)) slug = `${slug}-${product.id}`
        usedSlugs.add(slug)

        const firstVariant = product.variants?.[0]
        const priceValue = firstVariant?.price ? parseFloat(firstVariant.price) : 0

        // Eindeutige SKU
        let masterSku = firstVariant?.sku || ''
        if (!masterSku || usedSkus.has(masterSku)) {
          masterSku = `shopify-${product.id}-${firstVariant?.id || 'master'}`
        }
        usedSkus.add(masterSku)

        const ctProduct = {
          productType: { id: productType.id, typeId: 'product-type' },
          name: { de: product.title, 'en-US': product.title },
          slug: { de: slug, 'en-US': slug },
          description: product.body_html
            ? { de: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) }
            : undefined,
          masterVariant: {
            sku: masterSku,
            prices: priceValue > 0 ? [{
              value: {
                currencyCode: 'EUR',
                centAmount: Math.round(priceValue * 100),
                type: 'centPrecision',
                fractionDigits: 2
              }
            }] : [],
            images: product.images?.[0] ? [{
              url: product.images[0].src,
              dimensions: { w: product.images[0].width || 800, h: product.images[0].height || 800 },
              label: product.title
            }] : [],
            attributes: buildVariantAttributes(product, firstVariant)
          },
          variants: (product.variants?.slice(1) || []).map(v => {
            let varSku = v.sku || ''
            if (!varSku || usedSkus.has(varSku)) {
              varSku = `shopify-${product.id}-${v.id}`
            }
            usedSkus.add(varSku)
            return {
              sku: varSku,
              prices: parseFloat(v.price || 0) > 0 ? [{
                value: {
                  currencyCode: 'EUR',
                  centAmount: Math.round(parseFloat(v.price) * 100),
                  type: 'centPrecision',
                  fractionDigits: 2
                }
              }] : [],
              attributes: buildVariantAttributes(product, v)
            }
          }),
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
          results.push({
            name: product.title,
            status: 'error',
            error: data.message || data.errors?.[0]?.message || JSON.stringify(data.errors)
          })
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
