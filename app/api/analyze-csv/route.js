export async function POST(request) {
  try {
    const { rows, fileName } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Daten gefunden' }, { status: 400 })
    }

    const columns = Object.keys(rows[0])

    // Encoding-Reparatur: kaputte UTF-8 Sequenzen aus Latin-1-Exports fixen
    const fixEncoding = (str) => {
      if (typeof str !== 'string') return str
      try {
        return decodeURIComponent(escape(str))
      } catch {
        return str
      }
    }

    const cleanRows = rows.map(row => {
      const clean = {}
      for (const [k, v] of Object.entries(row)) {
        clean[fixEncoding(k)] = fixEncoding(v)
      }
      return clean
    })

    // Spalten-Klassifizierung: Content (CF) vs Commerce (CT)
    const contentColumns = ['title', 'name', 'label', 'description', 'body', 'content', 'text', 'summary', 'excerpt', 'meta_description', 'seo_description']
    const commerceColumns = ['price', 'sku', 'stock', 'inventory', 'weight', 'quantity', 'vendor', 'barcode', 'compare_at_price']

    const detectedContentCols = columns.filter(c => contentColumns.some(k => c.toLowerCase().includes(k)))
    const detectedCommerceCols = columns.filter(c => commerceColumns.some(k => c.toLowerCase().includes(k)))

    const hasCommerce = detectedCommerceCols.length > 0
    const hasContent = detectedContentCols.length > 0 || (!hasCommerce)

    // Slug-Kandidat ermitteln
    const slugCol = columns.find(c => ['uid', 'slug', 'handle', 'url', 'path', 'id'].some(k => c.toLowerCase().includes(k)))
    const titleCol = columns.find(c => ['title', 'name', 'label', 'headline'].some(k => c.toLowerCase().includes(k)))
    const bodyCol = columns.find(c => ['description', 'body', 'content', 'text', 'label'].some(k => c.toLowerCase().includes(k)))

    // Pages aus Rows bauen
    const pages = cleanRows.map((row, i) => ({
      id: row[slugCol] || row[columns[0]] || `csv-entry-${i}`,
      title: row[titleCol] || row[columns[1]] || `Eintrag ${i + 1}`,
      body: row[bodyCol] || '',
      handle: (row[slugCol] || `entry-${i}`).toString().toLowerCase().replace(/\s+/g, '-'),
      sourceRow: row,
    }))

    const inventory = {
      shopName: fileName || 'CSV Import',
      source: 'csv',
      columns,
      detectedContentCols,
      detectedCommerceCols,
      hasCommerce,
      hasContent,
      productCount: hasCommerce ? pages.length : 0,
      pages: hasContent && !hasCommerce ? pages : [],
      blogs: [],
      metafields: columns
        .filter(c => !detectedContentCols.includes(c) && !detectedCommerceCols.includes(c) && c !== slugCol && c !== titleCol)
        .map(c => ({ namespace: 'csv', key: c, source: 'csv' })),
      metafieldSources: { shop: 0, product: 0 },
      totalRows: cleanRows.length,
    }

    return Response.json(inventory)
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
