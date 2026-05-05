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
  const [shopRes, productsRes, pagesRes, blogsRes, metafieldsRes, themesRes, productSampleRes] = await Promise.all([
    fetch(`${base}/shop.json`, { headers }),
    fetch(`${base}/products/count.json`, { headers }),
    fetch(`${base}/pages.json?limit=250`, { headers }),
    fetch(`${base}/blogs.json?limit=250`, { headers }),
    fetch(`${base}/metafields.json?limit=250`, { headers }),
    fetch(`${base}/themes.json`, { headers }),
    // Stichprobe von 10 Produkten um Varianten-Optionen zu erkennen
    fetch(`${base}/products.json?limit=10&fields=id,title,options,variants,status`, { headers })
  ])

  const [shopData, productsData, pagesData, blogsData, metafieldsData, themesData, productSampleData] = await Promise.all([
    shopRes.json(),
    productsRes.json(),
    pagesRes.json(),
    blogsRes.json(),
    metafieldsRes.json(),
    themesRes.json(),
    productSampleRes.json()
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

  // Varianten-Optionen aus der Stichprobe extrahieren
  // z.B. ["Farbe", "Grösse", "Material"]
  const sampleProducts = productSampleData.products || []
  const variantOptionNames = [...new Set(
    sampleProducts.flatMap(p =>
      (p.options || [])
        .filter(o => o.name !== 'Title') // "Title" ist Shopify-Default für Produkte ohne Varianten
        .map(o => o.name)
    )
  )]

  // Status-Verteilung aus der Stichprobe
  const statusCounts = sampleProducts.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  // Normalisiertes Ergebnis zurückgeben
  return {
    source: 'shopify',
    shopName: shopData.shop?.name || domain,
    domain,
    productCount: productsData.count || 0,
    variantOptions: variantOptionNames, // z.B. ["Farbe", "Grösse"]
    statusDistribution: statusCounts,   // z.B. { active: 8, draft: 2 }
    pages: (pagesData.pages || []).map(p => ({
      id: p.id,
      title: p.title,
      handle: p.handle
    })),
    blogs: blogsWithCounts,
    metafields: (metafieldsData.metafields || []).map(m => ({
      id: m.id,
      namespace: m.namespace,
      key: m.key,
      type: m.type
    })),
    themes: (themesData.themes || []).map(t => ({
      id: t.id,
      name: t.name,
      role: t.role
    }))
  }
}
