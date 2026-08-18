// SAP WCMS / Hybris source adapter — CSV join logic
// Input: four pre-parsed CSV tables (semicolon-delimited, parsed client-side)
// Output: normalized inventory with one flat entry per ContentPage
//
// Join chain:
//   ContentPage → ContentSlotForPage → ContentSlot → WCMSHTMLComponent
//
// Column-name variants are handled with ?? chains because SAP export
// column names differ across Hybris versions (e.g. "contentPage.uid"
// vs "contentPage" vs "pageUid").  Only this file needs to change if
// a project exports non-standard columns.

export function analyzeSapWcms({
  contentPages       = [],
  contentSlots       = [],
  contentSlotForPages = [],
  htmlComponents     = [],
}) {
  // ── Debug: inspect raw column names and first few rows ───────────────────
  console.group('[SAP WCMS] analyzeSapWcms — debug')

  console.log(`contentPages: ${contentPages.length} rows`)
  console.log('contentPages columns:', contentPages[0] ? Object.keys(contentPages[0]) : '(empty)')
  console.table(contentPages.slice(0, 3))

  console.log(`contentSlotForPages: ${contentSlotForPages.length} rows`)
  console.log('contentSlotForPages columns:', contentSlotForPages[0] ? Object.keys(contentSlotForPages[0]) : '(empty)')
  console.table(contentSlotForPages.slice(0, 3))

  console.log(`contentSlots: ${contentSlots.length} rows`)
  console.log('contentSlots columns:', contentSlots[0] ? Object.keys(contentSlots[0]) : '(empty)')
  console.table(contentSlots.slice(0, 3))

  console.log(`htmlComponents: ${htmlComponents.length} rows`)
  console.log('htmlComponents columns:', htmlComponents[0] ? Object.keys(htmlComponents[0]) : '(empty)')
  console.table(htmlComponents.slice(0, 3))

  console.groupEnd()

  // ── Index ContentSlots by uid ────────────────────────────────────────────
  const slotById = Object.fromEntries(
    contentSlots.map(r => [r.uid ?? r.UID ?? '', r])
  )

  // ── Index HTMLComponents by the slot they belong to ──────────────────────
  const compsBySlot = {}
  for (const comp of htmlComponents) {
    const key =
      comp['contentSlot.uid'] ??
      comp.contentSlot ??
      comp.slotUid ??
      comp.slot ??
      ''
    if (!key) continue
    ;(compsBySlot[key] ??= []).push(comp)
  }

  // ── Index ContentSlotForPage relations by page uid ───────────────────────
  // SAP exports the page reference as a fully-qualified CMS item ID, e.g.
  //   "scottb2cContentCatalog:staged:winter-2026-freedom-to-explore"
  // ContentPage.uid contains only the bare uid ("winter-2026-freedom-to-explore"),
  // so we strip everything up to and including the last colon before indexing.
  const stripCatalogPrefix = (val) => val.includes(':') ? val.slice(val.lastIndexOf(':') + 1) : val

  const slotsByPage = {}
  for (const rel of contentSlotForPages) {
    const raw =
      rel['contentPage.uid'] ??
      rel.contentPage ??
      rel.pageUid ??
      rel.page ??
      ''
    const key = stripCatalogPrefix(raw)
    if (!key) continue
    ;(slotsByPage[key] ??= []).push(rel)
  }

  // ── Debug: compare page uid keys on both sides of the join ─────────────
  console.group('[SAP WCMS] join key comparison')
  const pageUidSample = contentPages.slice(0, 5).map(p => p.uid ?? p.UID ?? '(no uid field) → ' + JSON.stringify(p))
  const slotPageKeySample = Object.keys(slotsByPage).slice(0, 5)
  console.log('ContentPage uid sample:', pageUidSample)
  console.log('slotsByPage keys sample:', slotPageKeySample)
  console.log('slotsByPage total keys:', Object.keys(slotsByPage).length)
  console.groupEnd()

  // ── Join: one flat entry per ContentPage ─────────────────────────────────
  const allPages = contentPages.map(page => {
    const uid   = page.uid ?? page.UID ?? ''
    const slots = slotsByPage[uid] ?? []

    const html = { en: [], de: [], fr: [], it: [], es: [] }
    const css  = []
    const js   = []

    for (const slotRel of slots) {
      const rawSlotId =
        slotRel['contentSlot.uid'] ??
        slotRel.contentSlot ??
        slotRel.slotUid ??
        slotRel.slot ??
        ''
      const slotId = stripCatalogPrefix(rawSlotId)
      const comps = compsBySlot[slotId] ?? []

      for (const comp of comps) {
        // Primary content (English / default)
        // Column name variants across Hybris versions:
        //   html_en (newer exports), content, htmlContent, content_en, htmlContent_en
        const en =
          comp.html_en ??
          comp.content ??
          comp.htmlContent ??
          comp.content_en ??
          comp.htmlContent_en ??
          ''
        if (en) html.en.push(en)

        // Additional locale variants
        for (const lang of ['de', 'fr', 'it', 'es']) {
          const v =
            comp[`html_${lang}`] ??
            comp[`content_${lang}`] ??
            comp[`htmlContent_${lang}`] ??
            ''
          if (v) html[lang].push(v)
        }

        if (comp.externalCss) css.push(comp.externalCss)
        if (comp.externalJs)  js.push(comp.externalJs)
      }
    }

    return {
      uid,
      name:       page.name        ?? '',
      label:      page.label       ?? page.title ?? page.name ?? '',
      pageStatus: page.pageStatus  ?? page.approvalStatus ?? '',
      // CSS and JS live directly on ContentPage in this export format,
      // not on the WCMSHTMLComponent. Fall back to component-level values
      // if the page fields are empty (other export formats).
      customCss:  page.css         || [...new Set(css)].join('\n'),
      customJs:   page.js          || [...new Set(js)].join('\n'),
      htmlEn: html.en.join('\n\n'),
      htmlDe: html.de.join('\n\n'),
      htmlFr: html.fr.join('\n\n'),
      htmlIt: html.it.join('\n\n'),
      htmlEs: html.es.join('\n\n'),
    }
  })

  // ── Normalized inventory (same shape expected by the rest of the app) ────
  return {
    source:           'sap-wcms',
    shopName:         'SAP WCMS / Hybris',
    allPages,
    totalRows:        allPages.length,
    totalContentRows: allPages.length,
    // First 5 as preview tags in the UI
    pages: allPages.slice(0, 5).map(p => ({
      id:        p.uid,
      title:     p.label || p.name || p.uid,
      // Treat as published unless explicitly inactive — SAP exports often use
      // type references like "check:CmsApprovalStatus" rather than plain values.
      published: !p.pageStatus || !['INACTIVE', 'DISABLED'].includes(p.pageStatus.toUpperCase()),
    })),
    columns: ['uid', 'name', 'label', 'pageStatus', 'customCss', 'customJs',
              'htmlEn', 'htmlDe', 'htmlFr', 'htmlIt', 'htmlEs'],
    detectedContentCols:  ['htmlEn', 'htmlDe', 'htmlFr', 'htmlIt', 'htmlEs', 'label'],
    detectedCommerceCols: [],
    hasCommerce:      false,
    hasContent:       true,
    productCount:     0,
    blogs:            [],
    metafields:       [],
    metafieldSources: { shop: 0, product: 0 },
  }
}
