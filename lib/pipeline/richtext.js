/**
 * lib/pipeline/richtext.js
 *
 * Shared helpers for Contentful RichText conversion.
 * Centralised here to avoid duplicate implementations across migration routes.
 */

/**
 * Extracts plain text from a Contentful RichText document.
 * Paragraph boundaries are preserved as double newlines so that
 * buildRichTextFromString can reconstruct them accurately.
 *
 * @param {object} doc - Contentful RichText document
 * @returns {string}
 */
export function extractPlainText(doc) {
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

/**
 * Wraps a plain-text string (with \n\n paragraph breaks) into a
 * Contentful RichText document. Each double-newline-separated block
 * becomes its own paragraph node.
 *
 * @param {string} text
 * @returns {object} Contentful RichText document
 */
export function buildRichTextFromString(text) {
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

/**
 * Wraps a single plain-text value into a minimal Contentful RichText document
 * (one paragraph). Use for short strings such as titles that need to be stored
 * as RichText for schema-compatibility reasons.
 *
 * @param {string} text
 * @returns {object} Contentful RichText document
 */
export function toRichText(text) {
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
