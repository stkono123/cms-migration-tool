// Shopify-spezifischer Analyse-Adapter
// Lädt und normalisiert alle relevanten Shopify-Strukturdaten
// Für andere Quellsysteme: lib/adapters/{system}/analyze.js anlegen

export async function analyzeShopify() {
  const domain = process.env.SHOPIFY_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN

  if (!domain || !token) {
    throw new Error('SHOPIFY_DOMAIN oder SHOPIFY_ADMIN_TOKEN fehlen.')
  }

  const headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
  }

  const base = `https://${domain}/admin/api/2024-01`

  // Parallel laden für schnellere Analyse
  const [shopRes, productsRes, pagesRes, blogsRes, metafieldsRes, themesRes, productsForMetaRes] = await Promise.all([
    fetch(`${base}/shop.json`, { headers }),
    fetch(`${base}/products/count.json?status=active`, { headers }),
    fetch(`${base}/pages.json?limit=250`, { headers }),
    fetch(`${base}/blogs.json?limit=250`, { headers }),
    fetch(`${base}/metafields.json?limit=250`, { headers }),  // Shop-Level Metafields
    fetch(`${base}/themes.json`, { headers }),
    fetch(`${base}/products.json?limit=5&fields=id`, { headers })  // Erste 5 Produkte für Metafield-Scan
  ])

  const [shopData, productsData, pagesData, blogsData, metafieldsData, themesData, productsForMetaData] = await Promise.all([
    shopRes.json(),
    productsRes.json(),
    pagesRes.json(),
    blogsRes.json(),
    metafieldsRes.json(),
    themesRes.json(),
    productsForMetaRes.json()
  ])

  // Blog-Artikel-Anzahl pro Blog laden
  const blogs = blogsData.blogs || []
  const articleCounts = await Promise.all(
    blogs.map(blog =>
      fetch(`${base}/blogs/${blog.id}/articles/count.json`, { headers })
        .then(r => r.json())
        .then(d => ({ blogId: blog.id, count: d.count || 0 }))
    )
  )

  const blogsWithCounts = blogs.map(blog => ({
    id: blog.id,
    title: blog.title,
    articleCount: articleCounts.find(a => a.blogId === blog.id)?.count || 0
  }))

  // Produkt-Metafields laden (erste 5 Produkte als Sample)
  // Ziel: Metafield-Definitionen wie HMV erkennen die nur an Produkten hängen
  const sampleProducts = (productsForMetaData.products || []).slice(0, 5)
  const productMetafieldResults = await Promise.allSettled(
    sampleProducts.map(p =>
      fetch(`${base}/products/${p.id}/metafields.json?limit=250`, { headers })
        .then(r => r.json())
        .then(d => d.metafields || [])
    )
  )

  // Produkt-Metafields normalisieren und deduplizieren (nach namespace.key)
  const productMetafields = []
  const seenKeys = new Set()
  for (const result of productMetafieldResults) {
    if (result.status === 'fulfilled') {
      for (const m of result.value) {
        const key = `${m.namespace}.${m.key}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          productMetafields.push({
            id: m.id,
            namespace: m.namespace,
            key: m.key,
            type: m.type,
            source: 'product'
          })
        }
      }
    }
  }

  // Shop-Level Metafields
  const shopMetafields = (metafieldsData.metafields || []).map(m => ({
    id: m.id,
    namespace: m.namespace,
    key: m.key,
    type: m.type,
    source: 'shop'
  }))

  // Zusammenführen: Shop-Metafields zuerst, dann Produkt-Metafields
  // Duplikate nach namespace.key entfernen
  const allMetafieldKeys = new Set(shopMetafields.map(m => `${m.namespace}.${m.key}`))
  const mergedMetafields = [
    ...shopMetafields,
    ...productMetafields.filter(m => !allMetafieldKeys.has(`${m.namespace}.${m.key}`))
  ]

  return {
    source: 'shopify',
    shopName: shopData.shop?.name || domain,
    domain,
    productCount: productsData.count || 0,
    pages: (pagesData.pages || []).map(p => ({
      id: p.id,
      title: p.title,
      handle: p.handle
    })),
    blogs: blogsWithCounts,
    metafields: mergedMetafields,
    metafieldSources: {
      shop: shopMetafields.length,
      product: productMetafields.length,
      total: mergedMetafields.length
    },
    themes: (themesData.themes || []).map(t => ({
      id: t.id,
      name: t.name,
      role: t.role
    }))
  }
}
