import { fixEncoding } from '../../../lib/pipeline/text-optimizer.js'
import { toSlug } from '../../../lib/pipeline/slug.js'

export async function POST(request) {
  try {
    const { rows, fileName } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Daten gefunden' }, { status: 400 })
    }

    const columns = Object.keys(rows[0])

    const cleanRows = rows.map(row => {
      const clean = {}
      for (const [k, v] of Object.entries(row)) {
        clean[fixEncoding(k)] = fixEncoding(v)
      }
      return clean
    })

    // English and German column name keywords that indicate human-readable text content
    const contentColumns = [
      // English
      'title', 'name', 'label', 'description', 'body', 'content', 'text', 'summary', 'excerpt',
      'meta_description', 'seo_description', 'meta', 'seo', 'og_description', 'og_title', 'teaser',
      // German
      'titel', 'bezeichnung', 'beschreibung', 'inhalt', 'volltext', 'kurztext', 'kurzbeschreibung',
      'langtext', 'einleitung', 'zusammenfassung', 'seitentitel', 'seotitel', 'seo_titel',
      'metabeschreibung', 'ogbeschreibung',
    ]
    const commerceColumns = ['price', 'sku', 'stock', 'inventory', 'weight', 'quantity', 'vendor', 'barcode', 'compare_at_price']

    const detectedContentCols = columns.filter(c => contentColumns.some(k => c.toLowerCase().includes(k)))
    const detectedCommerceCols = columns.filter(c => commerceColumns.some(k => c.toLowerCase().includes(k)))

    const hasCommerce = detectedCommerceCols.length > 0
    const hasContent = detectedContentCols.length > 0 || !hasCommerce

    const slugCol = columns.find(c => ['uid', 'slug', 'handle', 'url', 'path', 'id'].some(k => c.toLowerCase().includes(k)))
    const titleCol = columns.find(c => ['title', 'name', 'label', 'headline'].some(k => c.toLowerCase().includes(k)))
    const bodyCol = columns.find(c => ['description', 'body', 'content', 'text', 'label'].some(k => c.toLowerCase().includes(k)))

    // Alle Rows als vollständige Datenbasis — aber nur Preview für UI
    const allPages = cleanRows.map((row, i) => ({
      id: row[slugCol] || row[columns[0]] || `csv-entry-${i}`,
      title: row[titleCol] || row[columns[1]] || `Eintrag ${i + 1}`,
      body: row[bodyCol] || '',
      handle: toSlug((row[slugCol] || `entry-${i}`).toString()),
      sourceRow: row,
    }))

    // UI bekommt nur 5 Preview-Einträge zum Anzeigen als Tags
    const previewPages = allPages.slice(0, 5).map(p => ({ id: p.id, title: p.title }))

    const inventory = {
      shopName: fileName || 'CSV Import',
      source: 'csv',
      columns,
      detectedContentCols,
      detectedCommerceCols,
      hasCommerce,
      hasContent,
      productCount: hasCommerce ? cleanRows.length : 0,
      pages: hasContent ? previewPages : [],
      totalContentRows: hasContent && !hasCommerce ? cleanRows.length : 0,
      blogs: [],
      metafields: columns
        .filter(c => !detectedContentCols.includes(c) && !detectedCommerceCols.includes(c) && c !== slugCol && c !== titleCol && /^[a-zA-Z0-9_]/.test(c.trim()))
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
