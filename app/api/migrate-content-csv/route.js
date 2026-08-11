import { optimizeCSVRow } from '../../../lib/pipeline/text-optimizer.js'
export const runtime = 'nodejs'
export const maxDuration = 300

// Wrap a plain string in the minimal Contentful RichText document structure.
// Contentful rejects a bare string for RichText fields with a ValidationError.
function toRichText(text) {
  return {
    nodeType: 'document',
    data: {},
    content: [{
      nodeType: 'paragraph',
      data: {},
      content: [{ nodeType: 'text', value: String(text ?? ''), marks: [], data: {} }]
    }]
  }
}

// Convert a raw CSV string to the correct JS type for a given Contentful field.
function coerceFieldValue(field, rawValue) {
  const str = String(rawValue ?? '')
  switch (field.type) {
    case 'RichText':  return toRichText(str)
    case 'Boolean':   return str.toLowerCase() === 'true'
    case 'Integer':   return parseInt(str) || 0
    case 'Number':    return parseFloat(str) || 0
    case 'Symbol':    return str.slice(0, 256)   // Contentful hard limit
    default:          return str
  }
}

function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function lcsWordDiff(before, after) {
  const a = (before || '').trim().split(/\s+/).filter(Boolean)
  const b = (after || '').trim().split(/\s+/).filter(Boolean)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
    }
  }
  const lcs = dp[m][n]
  const words_changed = m - lcs
  const words_added = n - lcs
  return { words_changed, words_added }
}

function wordCountDiff(beforeText, afterText) {
  const words_before = countWords(beforeText)
  const words_after = countWords(afterText)
  const words_delta_absolute = words_after - words_before
  const words_delta_percent = words_before > 0
    ? Math.round((words_delta_absolute / words_before) * 100)
    : 0
  const { words_changed, words_added } = lcsWordDiff(beforeText, afterText)
  const stronglyChanged = Math.abs(words_delta_percent) > 30
  return { words_before, words_after, words_delta_absolute, words_delta_percent, words_changed, words_added, stronglyChanged }
}

export async function POST(request) {
  try {
    const { rows, contentCols, settings, target, contentType } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Rows übergeben' }, { status: 400 })
    }
    console.log('Rows erhalten:', rows.length, 'contentCols:', contentCols)

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    const localeRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const defaultLocale = (localeData.items || []).find(l => l.default)?.code || 'en-US'

    const ctRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const ctData = await ctRes.json()
    const contentTypes = ctData.items || []

    const pageContentType =
      // 1. caller explicitly selected a content type by id or name
      (contentType && contentTypes.find(ct =>
        ct.sys.id.toLowerCase() === contentType.toLowerCase() ||
        ct.name?.toLowerCase() === contentType.toLowerCase()
      )) ||
      // 2. heuristic: id or name contains "page" / "seite"
      contentTypes.find(ct =>
        ct.sys.id.toLowerCase().includes('page') ||
        ct.sys.id.toLowerCase().includes('seite') ||
        ct.name?.toLowerCase().includes('page') ||
        ct.name?.toLowerCase().includes('seite')
      ) ||
      // 3. last resort: first available type
      contentTypes[0]

    if (!pageContentType) {
      return Response.json({
        error: 'Kein Content Type gefunden',
        availableTypes: contentTypes.map(ct => ct.sys.id)
      }, { status: 400 })
    }    

    const contentTypeId = pageContentType.sys.id
    const fields = pageContentType.fields || []

    // Log every field so mismatches between the heuristic and the actual
    // Contentful schema are visible in the server console.
    console.log(`[migrate-csv] Content type: "${contentTypeId}" — fields (${fields.length}):`)
    fields.forEach(f => console.log(`  ${f.id}  (${f.type})${f.required ? '  [required]' : ''}`))

    const titleField = fields.find(f =>
      f.id.toLowerCase().includes('title') ||
      f.id.toLowerCase().includes('titel') ||
      f.id.toLowerCase().includes('name')
    )

    const slugField = fields.find(f =>
      f.id.toLowerCase().includes('slug') ||
      f.id.toLowerCase().includes('uid') ||
      f.id.toLowerCase().includes('url')
    )

    // Broader heuristic for the body/long-text field.
    // Covers common CMS conventions: body, content, description, text,
    // copy, summary, excerpt, abstract, teaser, intro, richtext, long.
    const bodyField = fields.find(f => {
      const id = f.id.toLowerCase()
      return (
        id.includes('body') ||
        id.includes('content') ||
        id.includes('description') ||
        id.includes('text') ||
        id.includes('copy') ||
        id.includes('summary') ||
        id.includes('excerpt') ||
        id.includes('abstract') ||
        id.includes('teaser') ||
        id.includes('intro') ||
        id.includes('richtext') ||
        id.includes('long')
      )
    })

    console.log(`[migrate-csv] Field mapping — title: ${titleField?.id ?? 'NOT FOUND'}, slug: ${slugField?.id ?? 'NOT FOUND'}, body: ${bodyField?.id ?? 'NOT FOUND'}`)
    console.log(`[migrate-csv] CSV columns: ${Object.keys(rows[0]).join(', ')}`)

    const columns = Object.keys(rows[0])
    const titleCol = columns.find(c => ['title', 'name', 'label', 'headline'].some(k => c.toLowerCase().includes(k))) || columns[1]
    const slugCol = columns.find(c => ['uid', 'slug', 'handle', 'url', 'path'].some(k => c.toLowerCase().includes(k))) || columns[0]
    const bodyCol = columns.find(c => ['description', 'body', 'content', 'text', 'label'].some(k => c.toLowerCase().includes(k)))

    const results = []
    const migrationLog = []
    const wordCountLog = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const bodyBefore = bodyCol ? (row[bodyCol] || '') : ''
        // Always include titleCol in the optimized set so its language is
        // preserved/enhanced consistently with the body, even if analyze-csv
        // did not detect it as a content column (e.g. when titleCol resolved
        // to a column not named 'title'/'name'/'label').
        const effectiveContentCols = [...new Set([...contentCols, titleCol].filter(Boolean))]
        const { optimized, log } = await optimizeCSVRow(row, effectiveContentCols, settings)
        if (log.length > 0) migrationLog.push({ index: i, entries: log })

        const bodyAfter = bodyCol ? (optimized[bodyCol] || '') : ''
        const diff = wordCountDiff(bodyBefore, bodyAfter)
        wordCountLog.push({ index: i, title: optimized[titleCol] || `Eintrag ${i + 1}`, ...diff })

        const entryFields = {}
        const titleValue = optimized[titleCol] || `Eintrag ${i + 1}`
        const slugValue = (optimized[slugCol] || `entry-${i}`).toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const bodyValue = bodyAfter

        if (titleField) entryFields[titleField.id] = { [defaultLocale]: coerceFieldValue(titleField, titleValue) }
        if (slugField) entryFields[slugField.id] = { [defaultLocale]: coerceFieldValue(slugField, slugValue) }
        if (bodyField) entryFields[bodyField.id] = { [defaultLocale]: coerceFieldValue(bodyField, bodyValue) }

        for (const field of fields) {
          if (entryFields[field.id]) continue
          const matchingCol = columns.find(c => c.toLowerCase() === field.id.toLowerCase())
          if (matchingCol && optimized[matchingCol] !== undefined && optimized[matchingCol] !== '') {
            entryFields[field.id] = { [defaultLocale]: coerceFieldValue(field, optimized[matchingCol]) }
          }
        }

        const res = await fetch(
          `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/vnd.contentful.management.v1+json',
              'X-Contentful-Content-Type': contentTypeId
            },
            body: JSON.stringify({ fields: entryFields })
          }
        )

        const data = await res.json()

        if (res.ok) {
          results.push({ index: i, status: 'success', title: titleValue })
        } else {
          console.error('CF Entry Error:', JSON.stringify(data))
          results.push({ index: i, status: 'error', title: titleValue, error: data.message || 'Fehler', details: data.details })
        }
      } catch (e) {
        results.push({ index: i, status: 'error', title: `Eintrag ${i + 1}`, error: e.message })
        migrationLog.push({ index: i, entries: [{ action: 'error', error: e.message }] })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const encodingFixed = migrationLog.flatMap(l => l.entries).filter(e => e.action === 'encoding_fixed').length
    const enhanced = migrationLog.flatMap(l => l.entries).filter(e => e.action?.startsWith('l')).length
    const stronglyChanged = wordCountLog.filter(w => w.stronglyChanged).length

    return Response.json({
      results,
      summary: {
        total: rows.length,
        success: successCount,
        errors: rows.length - successCount,
        encodingFixed,
        enhanced,
        stronglyChanged,
      },
      migrationLog,
      wordCountLog,
      contentTypeUsed: contentTypeId,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
