// Shopify-spezifischer Analyse-Adapter
// Lädt und normalisiert alle relevanten Shopify-Strukturdaten
// Für andere Quellsysteme: lib/adapters/{system}/analyze.js anlegen

export async function analyzeShopify(domain, token) {
  if (!domain || !token) {
    throw new Error('Domain und Token erforderlich.')
  }

  const headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
  }

  const base = `https://${domain}/admin/api/2024-01`

  // Parallel laden für schnellere Analyse
  const [shopRes, productsActiveRes, productsDraftRes, productsArchivedRes, pagesRes, blogsRes, metafieldsRes, themesRes] = await Promise.all([
    fetch(`${base}/shop.json`, { headers }),
    fetch(`${base}/products/count.json?status=active`, { headers }),
    fetch(`${base}/products/count.json?status=draft`, { headers }),
    fetch(`${base}/products/count.json?status=archived`, { headers }),
    fetch(`${base}/pages.json?limit=250`, { headers }),
    fetch(`${base}/blogs.json?limit=250`, { headers }),
    fetch(`${base}/metafields.json?limit=250`, { headers }),
    fetch(`${base}/themes.json`, { headers })
  ])

  const [shopData, productsActiveData, productsDraftData, productsArchivedData, pagesData, blogsData, metafieldsData, themesData] = await Promise.all([
    shopRes.json(),
    productsActiveRes.json(),
    productsDraftRes.json(),
    productsArchivedRes.json(),
    pagesRes.json(),
    blogsRes.json(),
    metafieldsRes.json(),
    themesRes.json()
  ])

  // Blog-Artikel-Anzahl pro Blog laden (published + unpublished getrennt)
  const blogs = blogsData.blogs || []
  const articleCounts = await Promise.all(
    blogs.map(async blog => {
      const [publishedRes, unpublishedRes] = await Promise.all([
        fetch(`${base}/blogs/${blog.id}/articles/count.json?published_status=published`, { headers }),
        fetch(`${base}/blogs/${blog.id}/articles/count.json?published_status=unpublished`, { headers })
      ])
      const [publishedData, unpublishedData] = await Promise.all([
        publishedRes.json(),
        unpublishedRes.json()
      ])
      return {
        blogId: blog.id,
        published: publishedData.count || 0,
        unpublished: unpublishedData.count || 0
      }
    })
  )

  const blogsWithCounts = blogs.map(blog => {
    const counts = articleCounts.find(a => a.blogId === blog.id)
    return {
      id: blog.id,
      title: blog.title,
      articleCount: (counts?.published || 0) + (counts?.unpublished || 0),
      articleCountPublished: counts?.published || 0,
      articleCountUnpublished: counts?.unpublished || 0
    }
  })

  // Pages: published_at mitgeben, damit UI zwischen published/hidden unterscheiden kann
  const pages = (pagesData.pages || []).map(p => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    published: !!p.published_at
  }))

  const pagesPublished = pages.filter(p => p.published).length
  const pagesHidden = pages.filter(p => !p.published).length

  // Normalisiertes Ergebnis zurückgeben
  return {
    source: 'shopify',
    shopName: shopData.shop?.name || domain,
    domain,
    // Produkte nach Status
    productCount: productsActiveData.count || 0,
    productCountDraft: productsDraftData.count || 0,
    productCountArchived: productsArchivedData.count || 0,
    // Pages nach Status
    pages,
    pagesPublished,
    pagesHidden,
    // Blogs inkl. Artikel-Status
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
