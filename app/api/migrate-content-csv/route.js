import { optimizeCSVRow } from '../../../lib/pipeline/text-optimizer.js'
export const runtime = 'nodejs'
export const maxDuration = 300

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

function coerceFieldValue(field, rawValue) {
  const str = String(rawValue ?? '')
  switch (field.type) {
    case 'RichText':  return toRichText(str)
    case 'Boolean':   return str.toLowerCase() === 'true'
    case 'Integer':   return parseInt(str) || 0
    case 'Number':    return parseFloat(str) || 0
    case 'Symbol':    return str.slice(0, 256)
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
  return { words_changed: m - lcs, words_added: n - lcs }
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

function makeSlug(text, index) {
  return (text || `entry-${index}`)
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
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
        availableTypes: contentTypes.map(ct => ct.sys.id)
      }, { status: 400 })
    }

    const contentTypeId = pageContentType.sys.id
    const fields = pageContentType.fields || []

    const titleField = fields.find(f => {
      const id = f.id.toLowerCase()
      return !id.includes('seo') && (id.includes('title') || id.includes('titel') || id.includes('name'))
    })
    const
      
