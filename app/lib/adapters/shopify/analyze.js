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
  const [shopRes, productsRes, pagesRes, blogsRes, metafieldsRes, themesRes] = await Promise.all([
    fetch(`${base}/shop.json`, { headers }),
    fetch(`${base}/products/count.json?status=active`, { headers }),
    fetch(`${base}/pages.json?limit=250`, { headers }),
    fetch(`${base}/blogs.json?limit=250`, { headers }),
    fetch(`${base}/metafields.json?limit=250`, { headers }),
    fetch(`${base}/themes.json`, { headers })
  ])

  const [shopData, productsData, pagesData, blogsData, metafieldsData, themesData] = await Promise.all([
    shopRes.json(),
    productsRes.json(),
    pagesRes.json(),
    blogsRes.json(),
    metafieldsRes.json(),
    themesRes.json()
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

  // Normalisiertes Ergebnis zurückgeben
  // Dieses Format ist die Grundlage für ai-mapping und alle weiteren Pipeline-Schritte
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
