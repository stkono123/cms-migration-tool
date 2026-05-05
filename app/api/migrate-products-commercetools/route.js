// commercetools-spezifische Route zum Migrieren von Produkten
// Für andere Zielsysteme: migrate-products-{system}/route.js anlegen

export const runtime = 'nodejs'

// Umlaut-sichere Normalisierung für CT-Attributnamen
// Konsistent mit KI-Prompt-Logik: Umlaute weglassen
const normalizeAttrName = (name) => name
  .toLowerCase()
  .replace(/ä/g, 'a')
  .replace(/ö/g, 'o')
  .replace(/ü/g, 'u')
  .replace(/ß/g, 'ss')
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_]/g, '')

// Preis-Referenz berechnen
const getRefPrice = (variants, reference) => {
  const prices = (variants || []).map(v => parseFloat(v.price || 0)).filter(p => p > 0)
  if (prices.length === 0) return 0
  if (reference === 'max') return Math.max(...prices)
  if (reference === 'avg') return prices.reduce((a, b) => a + b, 0) / prices.length
  return Math.min(...prices)
}

// Preisfilter anwenden
const passesPrice = (product, settings) => {
  if (!settings?.priceOperator || settings.priceOperator === 'none') return true
  if (!settings.priceValue) return true
  const threshold = parseFloat(settings.priceValue)
  if (isNaN(threshold)) return true
  const refPrice = getRefPrice(product.variants, settings.priceReference || 'min')
  switch (settings.priceOperator) {
    case 'lt':  return refPrice < threshold
    case 'gt':  return refPrice > threshold
    case 'eq':  return refPrice === threshold
    case 'lte': return refPrice <= threshold
    case 'gte': return refPrice >= threshold
    default: return true
  }
}

export async function POST(request) {
  try {
    const { limit = 20, settings = {} } = await request.json()

    const shopifyDomain = process.env.SHOPIFY_DOMAIN
    const shopifyToken = process.env.SHOPIFY_ADMIN_TOKEN
    const ctProjectKey = process.env.CT_PROJECT_KEY
    const ctClientId = process.env.CT_CLIENT_ID
    const ctClientSecret = process.env.CT_CLIENT_SECRET
    const ctAuthUrl = process.env.CT_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com'
    const ctApiUrl = process.env.CT_API_URL || 'https://api.europe-west1.gcp.commercetools.com'

    // Kein hartes Limit — Nutzer entscheidet selbst, Default 20
    const safeLimit = limit > 0 ? limit : 20

    // Settings mit Defaults
    const statusFilter = settings.statusFilter?.length > 0 ? settings.statusFilter : ['active', 'draft', 'archived']
    const tagInclude = settings.tagInclude?.trim().toLowerCase() || ''
    const tagExclude = settings.tagExclude?.trim().toLowerCase() || 'intern'
    const productTypeFilter = settings.productTypeFilter?.trim().toLowerCase() || ''
    const onlyWithImages = settings.onlyWithImages || false
    const onlyWithSku = settings.onlyWithSku || false
    const inheritImages = settings.inheritImages !== false
    const transferVariantOptions = settings.transferVariantOptions !== false
    const maxImages = settings.maxImagesPerProduct ? parseInt(settings.maxImagesPerProduct) : null
    const skuFallback = settings.skuFallback || 'generate'
    const skuPrefix = settings.skuPrefix?.trim() || ''
    const duplicateHandling = settings.duplicateHandling || 'skip'

    // 1. Shopify Produkte laden — alle Status separat (Shopify API unterstützt kein status=any)
    const shopifyHeaders = { 'X-Shopify-Access-Token': shopifyToken, 'Content-Type': 'application/json' }
    const base = `https://${shopifyDomain}/admin/api/2024-01`
    const [res1, res2, res3] = await Promise.all([
      fetch(`${base}/products.json?limit=250&status=active`, { headers: shopifyHeaders }),
      fetch(`${base}/products.json?limit=250&status=draft`, { headers: shopifyHeaders }),
      fetch(`${base}/products.json?limit=250&status=archived`, { headers: shopifyHeaders }),
    ])
    const [d1, d2, d3] = await Promise.all([res1.json(), res2.json(), res3.json()])
    const allProducts = [...(d1.products || []), ...(d2.products || []), ...(d3.products || [])]

    // 2. Filtern anhand Settings
    const products = allProducts
      .filter(p => statusFilter.includes(p.status))
      .filter(p => {
        const tags = (p.tags || '').toLowerCase()
        if (tagExclude && tags.includes(tagExclude)) return false
        if (tagInclude && !tags.includes(tagInclude)) return false
        return true
      })
      .filter(p => !productTypeFilter || p.product_type?.toLowerCase() === productTypeFilter)
      .filter(p => !onlyWithImages || (p.images && p.images.length > 0))
      .filter(p => !onlyWithSku || p.variants?.some(v => v.sku && v.sku.trim() !== ''))
      .filter(p => passesPrice(p, settings))
      .slice(0, safeLimit)

    if (products.length === 0) {
      return Response.json({
        error: 'Keine passenden Produkte gefunden. Bitte Filter überprüfen.',
        totalLoaded: allProducts.length
      }, { status: 400 })
    }

    // 3. CT Auth Token
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

    // 5. Verfügbare Attribute aus CT auslesen
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

    // Varianten-Attribute inkl. Farbe/Grösse aus Shopify options
    const buildVariantAttributes = (product, variant) => {
      const optionAttributes = transferVariantOptions
        ? (product.options || []).map((opt, i) => {
            const optValue = variant?.[`option${i + 1}`]
            if (!optValue || optValue === 'Default Title') return null
            return {
              name: normalizeAttrName(opt.name),
              value: optValue
            }
          }).filter(Boolean)
        : []

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
        { name: 'sku',          value: variant?.sku || '' },
        { name: 'vendor',       value: product.vendor || '' },
        { name: 'hersteller',   value: product.vendor || '' },
        { name: 'category',     value: product.product_type || '' },
        { name: 'kategorie',    value: product.product_type || '' },
        { name: 'tags',         value: product.tags || '' },
        { name: 'status',       value: product.status || 'active' },
        ...optionAttributes.map(o => ({ name: o.name, value: o.value }))
      ]

      return allMappings
        .filter(m => availableAttributes.has(m.name))
        .map(m => ({ name: m.name, value: castValue(m.name, m.value) }))
    }

    // Bild-zu-Variante Mapping — mit Vererbungs-Option
    const buildVariantImages = (product, variant) => {
      const variantImages = (product.images || []).filter(img =>
        img.variant_ids && img.variant_ids.includes(variant.id)
      )
      const imagesToUse = variantImages.length > 0
        ? variantImages
        : (inheritImages ? (product.images || []) : [])
      const limited = maxImages ? imagesToUse.slice(0, maxImages) : imagesToUse
      return limited.map(img => ({
        url: img.src,
        dimensions: { w: img.width || 800, h: img.height || 800 },
        label: product.title
      }))
    }

    // 6. Kategorien laden und ggf. anlegen
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

    const uniqueTypes = [...new Set(products.map(p => p.product_type?.trim()).filter(Boolean))]
    for (const typeName of uniqueTypes) {
      if (categoryMap[typeName]) continue
      const slug = typeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const catRes = await fetch(`${ctApiUrl}/${ctProjectKey}/categories`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: { de: typeName, 'en-US': typeName }, slug: { de: slug, 'en-US': slug } })
      })
      const catData = await catRes.json()
      if (catRes.ok) categoryMap[typeName] = catData.id
    }

    // 7. Bestehende Slugs und Keys laden
    const existingRes = await fetch(
      `${ctApiUrl}/${ctProjectKey}/products?limit=500&staged=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const existingData = await existingRes.json()
    const existingSlugs = new Set(
      (existingData.results || []).flatMap(p => Object.values(p.masterData?.current?.slug || {}))
    )
    const existingKeys = new Set(
      (existingData.results || []).map(p => p.key).filter(Boolean)
    )

    // 8. Produkte migrieren
    const results = []
    const usedSlugs = new Set(existingSlugs)
    const usedKeys = new Set(existingKeys)
    const usedSkus = new Set()

    for (const product of products) {
      try {
        let slug = product.handle || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        // Duplikat-Handling
        if (usedSlugs.has(slug)) {
          if (duplicateHandling === 'skip') {
            results.push({ name: product.title, status: 'skipped', reason: 'Duplikat übersprungen' })
            continue
          }
          if (duplicateHandling === 'error') {
            results.push({ name: product.title, status: 'error', error: 'Duplikat gefunden' })
            continue
          }
          slug = `${slug}-${product.id}`
        }
        usedSlugs.add(slug)

        let key = product.handle || slug
        key = key.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 256)
        if (usedKeys.has(key)) key = `${key}-${product.id}`
        usedKeys.add(key)

        const firstVariant = product.variants?.[0]
        const priceValue = firstVariant?.price ? parseFloat(firstVariant.price) : 0

        // SKU-Behandlung anhand Settings
        let masterSku = firstVariant?.sku ? `${skuPrefix}${firstVariant.sku}` : ''
        let skuWarning = null
        if (!firstVariant?.sku) {
          if (skuFallback === 'skip') {
            results.push({ name: product.title, status: 'skipped', reason: 'Keine SKU vorhanden' })
            continue
          }
          masterSku = `${skuPrefix}shopify-${product.id}-${firstVariant?.id || 'master'}`
          skuWarning = skuFallback === 'warn' ? 'Warnung: Keine SKU in Shopify gepflegt' : 'Fallback-ID generiert'
        }
        if (usedSkus.has(masterSku)) masterSku = `${masterSku}-${firstVariant?.id}`
        usedSkus.add(masterSku)

        const categoryId = categoryMap[product.product_type?.trim()]
        const categories = categoryId ? [{ id: categoryId, typeId: 'category' }] : []

        // Master-Bilder (ohne Varianten-Zuweisung)
        let masterImages = (product.images || [])
          .filter(img => !img.variant_ids || img.variant_ids.length === 0)
          .map(img => ({ url: img.src, dimensions: { w: img.width || 800, h: img.height || 800 }, label: product.title }))

        if (masterImages.length === 0 && product.images?.[0]) {
          masterImages = [{ url: product.images[0].src, dimensions: { w: product.images[0].width || 800, h: product.images[0].height || 800 }, label: product.title }]
        }
        if (maxImages) masterImages = masterImages.slice(0, maxImages)

        // FIX: Produktname und Beschreibung als lokalisierte CT-Felder setzen
        const ctProduct = {
          productType: { id: productType.id, typeId: 'product-type' },
          key,
          name: { de: product.title, 'en-US': product.title },
          slug: { de: slug, 'en-US': slug },
          description: product.body_html
            ? { de: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500), 'en-US': product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) }
            : undefined,
          categories,
          masterVariant: {
            sku: masterSku,
            prices: priceValue > 0 ? [{ value: { currencyCode: 'EUR', centAmount: Math.round(priceValue * 100), type: 'centPrecision', fractionDigits: 2 } }] : [],
            images: masterImages,
            attributes: buildVariantAttributes(product, firstVariant)
          },
          variants: (product.variants?.slice(1) || []).map(v => {
            let varSku = v.sku ? `${skuPrefix}${v.sku}` : ''
            if (!varSku || usedSkus.has(varSku)) varSku = `${skuPrefix}shopify-${product.id}-${v.id}`
            usedSkus.add(varSku)
            return {
              sku: varSku,
              prices: parseFloat(v.price || 0) > 0 ? [{ value: { currencyCode: 'EUR', centAmount: Math.round(parseFloat(v.price) * 100), type: 'centPrecision', fractionDigits: 2 } }] : [],
              images: buildVariantImages(product, v),
              attributes: buildVariantAttributes(product, v)
            }
          }),
          publish: true
        }

        const res = await fetch(`${ctApiUrl}/${ctProjectKey}/products`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(ctProduct)
        })

        const data = await res.json()

        if (res.ok) {
          results.push({
            name: product.title,
            status: 'success',
            ctId: data.id,
            category: product.product_type,
            skuWarning: skuWarning || undefined,
            imagesCount: (ctProduct.masterVariant.images?.length || 0) +
              ctProduct.variants.reduce((sum, v) => sum + (v.images?.length || 0), 0)
          })
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
      categoriesCreated: Object.keys(categoryMap).length,
      settingsApplied: {
        statusFilter,
        tagInclude: tagInclude || null,
        tagExclude: tagExclude || null,
        priceFilter: settings.priceOperator !== 'none' ? `${settings.priceOperator} ${settings.priceValue} EUR` : null,
        inheritImages,
        skuFallback,
        duplicateHandling
      }
    })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
