// lib/converters/shopify-html-to-contentful-richtext.js
//
// Konvertiert Shopify body_html in das Contentful Rich Text JSON-Format.
// Kein externes Package nötig — reines Node.js.
//
// Contentful Rich Text Spec:
// https://www.contentful.com/developers/docs/concepts/rich-text/
//
// Architektur-Hinweis:
// Dieser Converter ist Teil von lib/converters/{source}-to-{target}/.
// Für neue Quell-/Zielsystem-Kombinationen: neuen Converter nach gleichem Muster anlegen.
// Bekannte Limitierungen:
//   - <img>-Tags erzeugen Platzhalter-Asset-Entries (keine echten Contentful Assets)
//   - Nested Lists (ul > ul) werden auf eine Ebene eingeflacht
//   - Unbekannte/komplexe Tags werden als Plain Text übernommen

// ─── Contentful Node-Typen ────────────────────────────────────────────────────

const BLOCKS = {
  DOCUMENT:        'document',
  PARAGRAPH:       'paragraph',
  HEADING_1:       'heading-1',
  HEADING_2:       'heading-2',
  HEADING_3:       'heading-3',
  HEADING_4:       'heading-4',
  HEADING_5:       'heading-5',
  HEADING_6:       'heading-6',
  UL_LIST:         'unordered-list',
  OL_LIST:         'ordered-list',
  LIST_ITEM:       'list-item',
  HR:              'hr',
  BLOCKQUOTE:      'blockquote',
  EMBEDDED_ASSET:  'embedded-asset-block',
}

const INLINES = {
  HYPERLINK:       'hyperlink',
}

const TEXT = 'text'

// ─── Helper: Text-Node ────────────────────────────────────────────────────────

function textNode(value, marks = []) {
  return {
    nodeType: TEXT,
    value: value || '',
    marks: marks.map(m => ({ type: m })),
    data: {}
  }
}

// ─── Helper: Block-Node ───────────────────────────────────────────────────────

function blockNode(nodeType, content = [], data = {}) {
  return { nodeType, data, content }
}

// ─── Helper: Inline-Node ──────────────────────────────────────────────────────

function inlineNode(nodeType, content = [], data = {}) {
  return { nodeType, data, content }
}

// ─── Mini HTML-Tokenizer ──────────────────────────────────────────────────────
// Zerlegt HTML-String in eine flache Liste von Tokens:
// { type: 'open'|'close'|'selfclose'|'text', tag, attrs, value }

function tokenize(html) {
  const tokens = []
  // Normalisieren: CRLF → LF, überflüssige Whitespace zwischen Tags kürzen
  const normalized = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g
  let lastIndex = 0
  let match

  while ((match = tagRegex.exec(normalized)) !== null) {
    // Text vor dem Tag
    if (match.index > lastIndex) {
      const text = normalized.slice(lastIndex, match.index)
      if (text) tokens.push({ type: 'text', value: decodeHtmlEntities(text) })
    }

    const isClose    = match[1] === '/'
    const tag        = match[2].toLowerCase()
    const attrString = match[3]
    const isSelf     = match[4] === '/' || ['br', 'hr', 'img', 'input'].includes(tag)

    const attrs = {}
    const attrRegex = /([a-zA-Z\-:]+)\s*=\s*["']([^"']*)["']/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1].toLowerCase()] = attrMatch[2]
    }

    if (isClose) {
      tokens.push({ type: 'close', tag })
    } else if (isSelf) {
      tokens.push({ type: 'selfclose', tag, attrs })
    } else {
      tokens.push({ type: 'open', tag, attrs })
    }

    lastIndex = tagRegex.lastIndex
  }

  // Restlicher Text nach letztem Tag
  if (lastIndex < normalized.length) {
    const text = normalized.slice(lastIndex)
    if (text.trim()) tokens.push({ type: 'text', value: decodeHtmlEntities(text) })
  }

  return tokens
}

// ─── HTML Entity Decoder ──────────────────────────────────────────────────────

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#039;/g,  "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/&auml;/g,  'ä')
    .replace(/&ouml;/g,  'ö')
    .replace(/&uuml;/g,  'ü')
    .replace(/&Auml;/g,  'Ä')
    .replace(/&Ouml;/g,  'Ö')
    .replace(/&Uuml;/g,  'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

// ─── Inline-Content Parser ────────────────────────────────────────────────────
// Verarbeitet Tokens innerhalb eines Block-Elements (Text, Links, Bold, Italic, etc.)
// Gibt Array von Contentful Inline-Nodes zurück.

function parseInlineContent(tokens, startIndex, activeMarks = []) {
  const nodes = []
  let i = startIndex

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'text') {
      const value = token.value
      if (value) nodes.push(textNode(value, activeMarks))
      i++
      continue
    }

    if (token.type === 'open') {
      const tag = token.tag

      // Bold
      if (tag === 'b' || tag === 'strong') {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, [...activeMarks, 'bold'])
        nodes.push(...inner)
        i = nextIndex
        continue
      }

      // Italic
      if (tag === 'i' || tag === 'em') {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, [...activeMarks, 'italic'])
        nodes.push(...inner)
        i = nextIndex
        continue
      }

      // Underline
      if (tag === 'u') {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, [...activeMarks, 'underline'])
        nodes.push(...inner)
        i = nextIndex
        continue
      }

      // Code
      if (tag === 'code') {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, [...activeMarks, 'code'])
        nodes.push(...inner)
        i = nextIndex
        continue
      }

      // Link
      if (tag === 'a') {
        const href = token.attrs?.href || ''
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, activeMarks)
        nodes.push(inlineNode(INLINES.HYPERLINK, inner.length > 0 ? inner : [textNode(href)], { uri: href }))
        i = nextIndex
        continue
      }

      // Span (ignoriere Tag, verarbeite Inhalt)
      if (tag === 'span') {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1, activeMarks)
        nodes.push(...inner)
        i = nextIndex
        continue
      }

      // Unbekannte Block-Tags innerhalb Inline-Kontext: als Text behandeln
      i++
      continue
    }

    if (token.type === 'selfclose') {
      if (token.tag === 'br') {
        nodes.push(textNode('\n'))
      }
      i++
      continue
    }

    if (token.type === 'close') {
      // Schließendes Tag beendet den aktuellen Inline-Kontext
      return { nodes, nextIndex: i + 1 }
    }

    i++
  }

  return { nodes, nextIndex: i }
}

// ─── Block-Level Parser ───────────────────────────────────────────────────────
// Verarbeitet Token-Stream auf Block-Ebene.
// Gibt Array von Contentful Block-Nodes zurück.

function parseBlocks(tokens) {
  const blocks = []
  let i = 0

  // Inline-Inhalt einsammeln bis Block-Tag kommt
  let pendingInline = []

  const flushPending = () => {
    const nonempty = pendingInline.filter(n => n.value?.trim() || n.nodeType !== TEXT)
    if (nonempty.length > 0) {
      blocks.push(blockNode(BLOCKS.PARAGRAPH, nonempty))
    }
    pendingInline = []
  }

  while (i < tokens.length) {
    const token = tokens[i]

    // ── Block-Level öffnende Tags ──────────────────────────────────────────

    if (token.type === 'open') {
      const tag = token.tag

      // Headings
      const headingMap = { h1: BLOCKS.HEADING_1, h2: BLOCKS.HEADING_2, h3: BLOCKS.HEADING_3, h4: BLOCKS.HEADING_4, h5: BLOCKS.HEADING_5, h6: BLOCKS.HEADING_6 }
      if (headingMap[tag]) {
        flushPending()
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1)
        const content = inner.length > 0 ? inner : [textNode('')]
        blocks.push(blockNode(headingMap[tag], content))
        i = nextIndex
        continue
      }

      // Paragraph
      if (tag === 'p' || tag === 'div') {
        flushPending()
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1)
        const content = inner.length > 0 ? inner : [textNode('')]
        blocks.push(blockNode(BLOCKS.PARAGRAPH, content))
        i = nextIndex
        continue
      }

      // Blockquote
      if (tag === 'blockquote') {
        flushPending()
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1)
        const content = inner.length > 0 ? inner : [textNode('')]
        blocks.push(blockNode(BLOCKS.BLOCKQUOTE, [blockNode(BLOCKS.PARAGRAPH, content)]))
        i = nextIndex
        continue
      }

      // Unordered List
      if (tag === 'ul') {
        flushPending()
        const { items, nextIndex } = parseListItems(tokens, i + 1)
        blocks.push(blockNode(BLOCKS.UL_LIST, items))
        i = nextIndex
        continue
      }

      // Ordered List
      if (tag === 'ol') {
        flushPending()
        const { items, nextIndex } = parseListItems(tokens, i + 1)
        blocks.push(blockNode(BLOCKS.OL_LIST, items))
        i = nextIndex
        continue
      }

      // Table → als Paragraph mit Plain Text (Contentful unterstützt kein natives Table)
      if (tag === 'table') {
        flushPending()
        const { text, nextIndex } = extractPlainText(tokens, i + 1)
        if (text.trim()) {
          blocks.push(blockNode(BLOCKS.PARAGRAPH, [textNode(`[Tabelle] ${text.trim()}`)]))
        }
        i = nextIndex
        continue
      }

      // Figure (meist Bild-Wrapper)
      if (tag === 'figure') {
        flushPending()
        i++
        continue
      }

      // Inline-Tags auf Block-Ebene → pendingInline
      if (['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'code'].includes(tag)) {
        const { nodes: inner, nextIndex } = parseInlineContent(tokens, i, [])
        pendingInline.push(...inner)
        i = nextIndex
        continue
      }

      // Alles andere ignorieren (section, article, nav, header etc.)
      i++
      continue
    }

    // ── Self-closing Tags ──────────────────────────────────────────────────

    if (token.type === 'selfclose') {
      if (token.tag === 'hr') {
        flushPending()
        blocks.push(blockNode(BLOCKS.HR))
        i++
        continue
      }

      if (token.tag === 'img') {
        flushPending()
        const src = token.attrs?.src || ''
        const alt = token.attrs?.alt || ''
        // Platzhalter-Asset — wird beim echten Asset-Upload durch echte ID ersetzt
        blocks.push({
          nodeType: BLOCKS.EMBEDDED_ASSET,
          data: {
            target: {
              sys: {
                id: `placeholder-${Buffer.from(src).toString('base64').slice(0, 16)}`,
                type: 'Link',
                linkType: 'Asset'
              }
            },
            // Originalinformationen für späteres Asset-Upload
            _shopifyImageSrc: src,
            _shopifyImageAlt: alt,
          },
          content: []
        })
        i++
        continue
      }

      if (token.tag === 'br') {
        pendingInline.push(textNode('\n'))
        i++
        continue
      }

      i++
      continue
    }

    // ── Text-Tokens auf Block-Ebene ────────────────────────────────────────

    if (token.type === 'text') {
      if (token.value.trim()) {
        pendingInline.push(textNode(token.value))
      }
      i++
      continue
    }

    // ── Schließende Tags ───────────────────────────────────────────────────

    if (token.type === 'close') {
      // figure schließen
      if (token.tag === 'figure') { i++; continue }
      i++
      continue
    }

    i++
  }

  flushPending()
  return blocks
}

// ─── Listen-Parser ────────────────────────────────────────────────────────────

function parseListItems(tokens, startIndex) {
  const items = []
  let i = startIndex

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'close' && (token.tag === 'ul' || token.tag === 'ol')) {
      return { items, nextIndex: i + 1 }
    }

    if (token.type === 'open' && token.tag === 'li') {
      const { nodes: inner, nextIndex } = parseInlineContent(tokens, i + 1)
      const content = inner.length > 0 ? inner : [textNode('')]
      items.push(blockNode(BLOCKS.LIST_ITEM, [blockNode(BLOCKS.PARAGRAPH, content)]))
      i = nextIndex
      continue
    }

    i++
  }

  return { items, nextIndex: i }
}

// ─── Plain Text Extraktor (für nicht unterstützte Tags wie table) ─────────────

function extractPlainText(tokens, startIndex) {
  let text = ''
  let i = startIndex
  let depth = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (token.type === 'open') depth++
    if (token.type === 'close') {
      if (depth === 0) return { text, nextIndex: i + 1 }
      depth--
    }
    if (token.type === 'text') text += token.value + ' '
    i++
  }

  return { text, nextIndex: i }
}

// ─── Haupt-Export ─────────────────────────────────────────────────────────────

/**
 * Konvertiert Shopify body_html in ein Contentful Rich Text Document.
 *
 * @param {string} html - Shopify body_html
 * @returns {object} Contentful Rich Text Document
 */
export function shopifyHtmlToContentfulRichtext(html) {
  if (!html || typeof html !== 'string' || html.trim() === '') {
    return {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: [blockNode(BLOCKS.PARAGRAPH, [textNode('')])]
    }
  }

  const tokens = tokenize(html)
  const blocks = parseBlocks(tokens)

  // Sicherheitsnetz: Dokument darf nicht leer sein
  const content = blocks.length > 0
    ? blocks
    : [blockNode(BLOCKS.PARAGRAPH, [textNode('')])]

  return {
    nodeType: BLOCKS.DOCUMENT,
    data: {},
    content
  }
}

/**
 * Gibt alle Shopify-Bild-URLs zurück die im HTML vorkommen.
 * Nützlich um später echte Contentful Assets hochzuladen.
 *
 * @param {string} html - Shopify body_html
 * @returns {Array<{src: string, alt: string}>}
 */
export function extractShopifyImages(html) {
  if (!html) return []
  const images = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*\/?>/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    images.push({ src: match[1], alt: match[2] || '' })
  }
  return images
}
