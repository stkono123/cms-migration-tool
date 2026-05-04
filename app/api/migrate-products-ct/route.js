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

    // 1. Shopify Produkte laden — mehr laden als nötig da wir filtern
    const shopifyRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=250&status=active`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json'
        }
      }
    )
    const shopifyData = await shopifyRes.json()
    const allProducts = shopifyData.products || []

    // 2. Filtern: nur Produkte mit product_type und ohne "intern" Tag
    const products = allProducts
      .filter(p => p.product_type && p.product_type.trim() !== '')
      .filter(p => {
        const tags = (p.tags || '').toLowerCase()
        return !tags.includes('intern')
      })
      .slice(0, safeLimit)

    if (products.length === 0) {
      return Response.json({
        error: 'Keine passenden Produkte gefunden. Entweder haben alle Produkte keinen Produkttyp oder sind als "intern" getaggt.',
        totalLoaded: allProducts.length
      }, { status: 400 })
    }

    // 3. CT Auth Token holen
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

    // 4. CT Product Type holen
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

    // 5. Vorhandene Attribute aus CT auslesen mit Typ
    const attributeDefinitions = {}
    for (const attr of (productType.attributes || [])) {
      attributeDefinitions[attr.name] = attr.type?.name || 'text'
    }
    const availableAttributes = new Set(Object.keys(attributeDefinitions))

    const castValue = (attrName, value) => {
      const type = attributeDefinitions[attrName]
      if (type === 'number' || type === 'integer') {
        const num = parseFloat(value)
        return isNaN(num) ? 0 : num
      }
      if (type === 'boolean') return value === 'true' || value === true
      return String(value)
    }

    const buildVariantAttributes = (product, variant) => {
      const allMappings = [
        { name: 'product_id',   value: String(product.id) },
        { name: 'shopify_id',   value: String(product.id) },
        { name: 'name',         value: product.title },
        { name: 'title',        value: product.title },
        { name: 'titel',        value: product.title },
        { name: 'price',        value: variant?.price ? `${parseFloat(variant.price)} EUR` : '0 EUR (Rezeptpflichtig)' },
        { name: 'preis',        value: variant?.price ? `${parseFloat(variant.price)} EUR` : '0 EUR (Rezeptpflichtig)' },
        { name: 'inventory',    value: variant?.inventory_quantity || 0 },
        { name: 'inventar',     value: variant?.inventory_quantity || 0 },
        { name: 'lagerbestand', value: variant?.inventory_quantity || 0 },
        { name: 'sku',          value: variant?.sku || `shopify-${product.id}-${variant?.id || 'master'}` },
        { name: 'vendor',       value: product.vendor || '' },
        { name: 'hersteller',   value: product.vendor || '' },
        { name: 'category',     value: product.product_type || '' },
        { name: 'kategorie',    value: product.product_type || '' },
        { name: 'tags',         value: product.tags || '' },
        { name: 'status',       value: product.status || 'active' },
      ]

      return allMappings
        .filter(m => availableAttributes.has(m.name))
        .map(m => ({ name: m.name, value: castValue(m.name, m.value) }))
    }

    // 6. Bestehende CT-Kategorien laden
    const existingCatsRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/categories?limit=500`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const existingCatsData = await existingCatsRes.json()
    const categoryMap = {}
    for (const cat of (existingCatsData.results || [])) {
      const key = cat.name?.de || cat.name?.['en-US'] || ''
      if (key) categoryMap[key] = cat.id
    }

    // 7. Benötigte Kategorien aus product_type sammeln und ggf. anlegen
    const uniqueTypes = [...new Set(products.map(p => p.product_type.trim()))]

    for (const typeName of uniqueTypes) {
      if (categoryMap[typeName]) continue

      const slug = typeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const catRes = await fetch(`${ctApiUrl}/${ctProjectKey}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: { de: typeName, 'en-US': typeName },
          slug: { de: slug, 'en-US': slug }
        })
      })
      const catData = await catRes.json()
      if (catRes.ok) {
        categoryMap[typeName] = catData.id
      }
    }

    // 8. Bestehende Slugs und Keys laden
    const existingRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/products?limit=500&staged=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const existingData = await existingRes.json()
    const existingSlugs = new Set(
      (existingData.results || []).flatMap(p =>
        Object.values(p.masterData?.current?.slug || {})
      )
    )
    const existingKeys = new Set(
      (existingData.results || []).map(p => p.key).filter(Boolean)
    )

    // 9. Produkte nach CT migrieren
    const results = []
    const usedSlugs = new Set(existingSlugs)
    const usedKeys = new Set(existingKeys)
    const usedSkus = new Set()

    for (const product of products) {
      try {
        let slug = product.handle || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (usedSlugs.has(slug)) slug = `${slug}-${product.id}`
        usedSlugs.add(slug)

        let key = product.handle || slug
        key = key.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 256)
        if (usedKeys.has(key)) key = `${key}-${product.id}`
        usedKeys.add(key)

        const firstVariant = product.variants?.[0]
        const priceValue = firstVariant?.price ? parseFloat(firstVariant.price) : 0

        let masterSku = firstVariant?.sku || ''
        if (!masterSku || usedSkus.has(masterSku)) {
          masterSku = `shopify-${product.id}-${firstVariant?.id || 'master'}`
        }
        usedSkus.add(masterSku)

        // Kategorie-Referenz aus product_type
        const categoryId = categoryMap[product.product_type?.trim()]
        const categories = categoryId
          ? [{ id: categoryId, typeId: 'category' }]
          : []

        const ctProduct = {
          productType: { id: productType.id, typeId: 'product-type' },
          key,
          name: { de: product.title, 'en-US': product.title },
          slug: { de: slug, 'en-US': slug },
          description: product.body_html
            ? { de: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) }
            : undefined,
          categories,
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
            if (!varSku || usedSkus.has(varSku)) varSku = `shopify-${product.id}-${v.id}`
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
          results.push({ name: product.title, status: 'success', ctId: data.id, category: product.product_type })
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

    return Response.json({
      results,
      total: products.length,
      filtered: allProducts.length - products.length,
      categoriesCreated: Object.keys(categoryMap).length
    })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
