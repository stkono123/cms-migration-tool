import { optimizeCSVRow, optimizeText, fixEncoding } from '../../../lib/pipeline/text-optimizer.js'
import { extractPlainText, buildRichTextFromString, toRichText } from '../../../lib/pipeline/richtext.js'
import { resolveLanguageContext } from '../../../lib/pipeline/language-context.js'
import { toSlug } from '../../../lib/pipeline/slug.js'

export const runtime = 'nodejs'
export const maxDuration = 300

// ─── Field value coercion ────────────────────────────────────────────────────

function coerceFieldValue(field, rawValue) {
  if (field.type === 'RichText') {
    return (typeof rawValue === 'object' && rawValue?.nodeType)
      ? rawValue
      : toRichText(String(rawValue ?? ''))
  }
  const str = String(rawValue ?? '')
  switch (field.type) {
    case 'Boolean': return str.toLowerCase() === 'true'
    case 'Integer': return parseInt(str)  || 0
    case 'Number':  return parseFloat(str) || 0
    case 'Symbol':  return str.slice(0, 256)
    default:        return str
  }
}

// ─── Word-count diff helpers ─────────────────────────────────────────────────

function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function lcsWordDiff(before, after) {
  const a = (before || '').trim().split(/\s+/).filter(Boolean)
  const b = (after  || '').trim().split(/\s+/).filter(Boolean)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
    }
  }
  const lcs = dp[m][n]
  return { words_changed: m - lcs, words_added: n - lcs }
}

function wordCountDiff(beforeText, afterText) {
  const words_before          = countWords(beforeText)
  const words_after           = countWords(afterText)
  const words_delta_absolute  = words_after - words_before
  const words_delta_percent   = words_before > 0
    ? Math.round((words_delta_absolute / words_before) * 100)
    : 0
  const { words_changed, words_added } = lcsWordDiff(beforeText, afterText)
  const stronglyChanged = Math.abs(words_delta_percent) > 30
  return { words_before, words_after, words_delta_absolute, words_delta_percent, words_changed, words_added, stronglyChanged }
}

// ─── Slug helper ─────────────────────────────────────────────────────────────
// Delegates to lib/pipeline/slug.js which converts German umlauts first
// so "für" → "fuer", not "fr".

function makeSlug(text, index) {
  return toSlug((text || `entry-${index}`).toString())
    .slice(0, 80)
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { rows, contentCols, settings, target, contentType } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Rows übergeben' }, { status: 400 })
    }
    console.log('Rows erhalten:', rows.length, 'contentCols:', contentCols)
    console.log('Erste Row:', JSON.stringify(rows[0]))

    const spaceId   = process.env.CONTENTFUL_SPACE_ID
    const token     = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    // ── Contentful locales ────────────────────────────────────────────
    const localeRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const localeData  = await localeRes.json()
    const defaultLocale = (localeData.items || []).find(l => l.default)?.code || 'en-US'

    // ── Content type ──────────────────────────────────────────────────
    const ctRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/content_types?limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const ctData       = await ctRes.json()
    const contentTypes = ctData.items || []

    const pageContentType =
      (contentType && contentTypes.find(ct =>
        ct.sys.id.toLowerCase() === contentType.toLowerCase() ||
        ct.name?.toLowerCase() === contentType.toLowerCase()
      )) ||
      contentTypes.find(ct =>
        ct.sys.id.toLowerCase().includes('page') ||
        ct.sys.id.toLowerCase().includes('seite') ||
        ct.name?.toLowerCase().includes('page') ||
        ct.name?.toLowerCase().includes('seite')
      ) ||
      contentTypes[0]

    if (!pageContentType) {
      return Response.json({
        error: 'Kein Content Type gefunden',
        availableTypes: contentTypes.map(ct => ct.sys.id),
      }, { status: 400 })
    }

    const contentTypeId = pageContentType.sys.id
    const fields        = pageContentType.fields || []

    // ── Field detection ───────────────────────────────────────────────
    const titleField = fields.find(f => {
      const id = f.id.toLowerCase()
      return !id.includes('seo') && (id.includes('title') || id.includes('titel') || id.includes('name'))
    })
    const slugField = fields.find(f =>
      f.id.toLowerCase().includes('slug') ||
      f.id.toLowerCase().includes('uid')  ||
      f.id.toLowerCase().includes('url')
    )
    const bodyField = fields.find(f => {
      const id = f.id.toLowerCase()
      return (
        !id.includes('seo') && !id.includes('meta') && !id.includes('beschreibung') &&
        (id.includes('body') || id.includes('content') || id.includes('description') ||
         id.includes('text') || id.includes('copy')  || id.includes('summary') ||
         id.includes('excerpt') || id.includes('abstract') || id.includes('teaser') ||
         id.includes('intro') || id.includes('richtext') || id.includes('long') ||
         id.includes('inhalt') || id.includes('seiteninhalt') || id.includes('seiteninhal'))
      )
    })
    const metaField = fields.find(f => {
      const id = f.id.toLowerCase()
      return (
        f.id !== bodyField?.id &&
        (id.includes('meta') || id.includes('beschreibung') ||
         (id.includes('seo') && id.includes('description')) ||
         (id.includes('seo') && id.includes('desc')))
      )
    })
    const seoTitleField = fields.find(f => {
      const id = f.id.toLowerCase()
      return (
        f.id !== titleField?.id && f.id !== slugField?.id &&
        f.id !== bodyField?.id && f.id !== metaField?.id &&
        (id === 'seotitle' || id.includes('seo-title') || id.includes('seo_title') ||
         (id.includes('seo') && id.includes('title')))
      )
    })
    const pageTypeField = fields.find(f => {
      const id = f.id.toLowerCase()
      return (
        f.id !== titleField?.id && f.id !== slugField?.id &&
        f.id !== bodyField?.id && f.id !== metaField?.id &&
        (id.includes('seitentyp') || id.includes('pagetype') ||
         id.includes('page_type') || id.includes('page-type') || id === 'type')
      )
    })
    const ogTitleField = fields.find(f => {
      const id = f.id.toLowerCase()
      return id.includes('og') && id.includes('title')
    })
    const ogDescField = fields.find(f => {
      const id = f.id.toLowerCase()
      return id.includes('og') && (id.includes('desc') || id.includes('description'))
    })
    const canonicalField = fields.find(f =>
      f.id.toLowerCase().includes('canonical')
    )

    // ── CSV column detection ──────────────────────────────────────────
    const columns    = Object.keys(rows[0])
    const titleCol   = columns.find(c => ['title', 'name', 'label', 'headline'].some(k => c.toLowerCase().includes(k))) || columns[1]
    const slugCol    = columns.find(c => ['uid', 'slug', 'handle', 'url', 'path'].some(k => c.toLowerCase().includes(k))) || columns[0]
    const bodyCol    = columns.find(c => ['description', 'body', 'content', 'text', 'label', 'inhalt', 'seiteninhalt'].some(k => c.toLowerCase().includes(k)))
    const seoTitleCol = columns.find(c => {
      const l = c.toLowerCase()
      return l === 'seotitle' || l === 'seo_title' || l === 'seo-title' ||
        (l.includes('seo') && l.includes('title'))
    })
    const metaCol = columns.find(c => {
      const l = c.toLowerCase()
      if (c === seoTitleCol) return false
      if (l.includes('title') || l.includes('titel')) return false
      return (
        l.includes('meta') || l.includes('beschreibung') ||
        l.includes('seodescription') || l.includes('seodesc') ||
        l.includes('seo_description') || l.includes('seo-description') ||
        l.includes('seo_desc') || l.includes('seo-desc') || l.includes('seo')
      )
    })
    const pageTypeCol  = columns.find(c => ['seitentyp', 'pagetype', 'page_type', 'page-type', 'type'].some(k => c.toLowerCase() === k || c.toLowerCase().includes(k)))
    const ogTitleCol   = columns.find(c => c.toLowerCase().includes('ogtitle') || c.toLowerCase() === 'og_title' || c.toLowerCase() === 'og-title')
    const ogDescCol    = columns.find(c => c.toLowerCase().includes('ogdesc') || c.toLowerCase().includes('og_desc') || c.toLowerCase().includes('og-desc') || c.toLowerCase().includes('ogdescription'))
    const canonicalCol = columns.find(c => c.toLowerCase().includes('canonical'))

    const fmt = f => f ? `${f.id} (${f.type})` : 'NOT FOUND'
    console.log(`[migrate-csv] Content type: "${contentTypeId}" — fields (${fields.length}):`)
    console.log(`[migrate-csv] Field mapping: title=${fmt(titleField)} slug=${fmt(slugField)} body=${fmt(bodyField)} meta=${fmt(metaField)} seoTitle=${fmt(seoTitleField)} ogTitle=${fmt(ogTitleField)} ogDesc=${fmt(ogDescField)} canonical=${fmt(canonicalField)}`)

    // ── Language context ──────────────────────────────────────────────
    // Sample from the frontend-designated content columns (contentCols) —
    // these are exactly the columns that will be sent through optimizeText,
    // so detection is based on the same data that will be optimised.
    // We supplement with the auto-detected bodyCol as a second source.
    // This avoids the failure mode where bodyCol heuristics miss a
    // column called "Beschreibung", "Volltext", etc.
    const samplingCols = contentCols.length > 0
      ? contentCols
      : bodyCol ? [bodyCol] : []

    const bodySamples = [
      ...samplingCols.flatMap(col => rows.slice(0, 3).map(r => r[col]).filter(v => typeof v === 'string')),
      ...(bodyCol && !samplingCols.includes(bodyCol)
        ? rows.slice(0, 3).map(r => r[bodyCol]).filter(Boolean)
        : []),
    ]

    const languageContext = await resolveLanguageContext({ settings, bodySamples })
    console.log(`[migrate-csv] Language context:`, languageContext)

    // ── Migration loop ────────────────────────────────────────────────
    const results      = []
    const migrationLog = []
    const wordCountLog = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Body can arrive as a string (CSV) or as a RichText document (ZIP channel).
        // RichText objects are converted to plain text for AI optimisation, then
        // reconstructed as RichText afterwards.
        const rawBodyValue  = bodyCol ? row[bodyCol] : undefined
        const bodyIsRichText = !!(rawBodyValue && typeof rawBodyValue === 'object' && rawBodyValue.nodeType === 'document')
        const bodyBefore = bodyIsRichText
          ? extractPlainText(rawBodyValue)
          : (typeof rawBodyValue === 'string' ? rawBodyValue : '')

        const effectiveContentCols = [...new Set([...contentCols, titleCol].filter(Boolean))]
        const { optimized, log } = await optimizeCSVRow(row, effectiveContentCols, settings, languageContext)
        if (log.length > 0) migrationLog.push({ index: i, entries: log })

        let bodyAfter = bodyIsRichText
          ? bodyBefore
          : (bodyCol ? (typeof optimized[bodyCol] === 'string' ? optimized[bodyCol] : '') : '')

        // RichText bodies bypass optimizeCSVRow (which only handles strings),
        // so optimise them separately here when a level > 0 is requested.
        if (bodyIsRichText && settings?.textLevel > 0 && bodyBefore) {
          bodyAfter = await optimizeText(bodyBefore, settings, languageContext)
        }

        const diff = wordCountDiff(bodyBefore, bodyAfter)
        wordCountLog.push({ index: i, title: optimized[titleCol] || `Eintrag ${i + 1}`, ...diff })

        const entryFields = {}

        // Title — strip markdown headings and multi-sentence text from optimised output
        const rawTitle  = optimized[titleCol] || `Eintrag ${i + 1}`
        const titleValue = rawTitle
          .split(/\n/).map(l => l.trim()).find(l => l.length > 0)
          ?.replace(/^#+\s*/, '').split(/(?<=[.!?])\s+/)[0].slice(0, 200).trim()
          || `Eintrag ${i + 1}`

        const slugValue = makeSlug(titleValue, i)

        // Reconstruct RichText if the body was optimised; keep original if not.
        const bodyValue = bodyIsRichText
          ? (settings?.textLevel > 0 && bodyBefore
              ? buildRichTextFromString(bodyAfter)
              : rawBodyValue)
          : bodyAfter

        if (titleField) entryFields[titleField.id] = { [defaultLocale]: coerceFieldValue(titleField, titleValue) }
        if (slugField)  entryFields[slugField.id]  = { [defaultLocale]: coerceFieldValue(slugField, slugValue) }
        if (bodyField)  entryFields[bodyField.id]  = { [defaultLocale]: coerceFieldValue(bodyField, bodyValue) }

        // SEO / OG fields
        const metaValue = (metaCol && optimized[metaCol]) || row.metaDescription || ''
        if (metaField && metaValue) {
          entryFields[metaField.id] = { [defaultLocale]: coerceFieldValue(metaField, metaValue.slice(0, 160)) }
        }

        const seoTitleValue = (seoTitleCol && optimized[seoTitleCol]) || row.seoTitle || ''
        if (seoTitleField && seoTitleValue) {
          entryFields[seoTitleField.id] = { [defaultLocale]: coerceFieldValue(seoTitleField, seoTitleValue.slice(0, 60)) }
        }

        const ogTitleValue = (ogTitleCol && optimized[ogTitleCol]) || row.ogTitle || seoTitleValue || titleValue
        if (ogTitleField && ogTitleValue) {
          entryFields[ogTitleField.id] = { [defaultLocale]: coerceFieldValue(ogTitleField, ogTitleValue.slice(0, 60)) }
        }

        const ogDescValue = (ogDescCol && optimized[ogDescCol]) || row.ogDescription || metaValue
        if (ogDescField && ogDescValue) {
          entryFields[ogDescField.id] = { [defaultLocale]: coerceFieldValue(ogDescField, ogDescValue.slice(0, 160)) }
        }

        const canonicalValue = (canonicalCol && optimized[canonicalCol]) || row.canonicalUrl || ''
        if (canonicalField && canonicalValue) {
          entryFields[canonicalField.id] = { [defaultLocale]: coerceFieldValue(canonicalField, canonicalValue) }
        }

        if (pageTypeField && pageTypeCol && optimized[pageTypeCol]) {
          entryFields[pageTypeField.id] = { [defaultLocale]: coerceFieldValue(pageTypeField, optimized[pageTypeCol]) }
        }

        // Generic pass: any remaining CT field whose ID matches a CSV column name
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
              'X-Contentful-Content-Type': contentTypeId,
            },
            body: JSON.stringify({ fields: entryFields }),
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

    const successCount    = results.filter(r => r.status === 'success').length
    const encodingFixed   = migrationLog.flatMap(l => l.entries).filter(e => e.action === 'encoding_fixed').length
    const enhanced        = migrationLog.flatMap(l => l.entries).filter(e => e.action?.startsWith('l')).length
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
      languageContext,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
