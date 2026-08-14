import { optimizeCSVRow, optimizeText } from '../../../lib/pipeline/text-optimizer.js'
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

// Extrahiert reinen Text aus einem Contentful RichText-Dokument
// (wird benoetigt, um Objekt-Body-Werte wie aus dem ZIP-Kanal fuer die
// Text-Optimierung zugaenglich zu machen)
function extractPlainText(doc) {
  if (!doc?.content) return ''
  const parts = []
  function walk(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 'text') parts.push(node.value)
      else if (node.content) walk(node.content)
    }
  }
  walk(doc.content)
  return parts.join('\n\n')
}

// Baut aus optimiertem Fliesstext wieder ein RichText-Dokument
// (Absaetze werden anhand von Leerzeilen getrennt)
function buildRichTextFromString(text) {
  const paragraphs = String(text ?? '').split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return {
    nodeType: 'document',
    data: {},
    content: (paragraphs.length ? paragraphs : [String(text ?? '')]).map(p => ({
      nodeType: 'paragraph',
      data: {},
      content: [{ nodeType: 'text', value: p, marks: [], data: {} }]
    }))
  }
}

function coerceFieldValue(field, rawValue) {
  if (field.type === 'RichText') {
    return (typeof rawValue === 'object' && rawValue?.nodeType) ? rawValue : toRichText(String(rawValue ?? ''))
  }
  const str = String(rawValue ?? '')
  switch (field.type) {
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

export async function
